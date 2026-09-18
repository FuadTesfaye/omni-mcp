import type { CliCommandInfo, CliOptionInfo } from "./analyzer.js";

export interface BuildArgvOptions {
  binary: string;
  subcommand?: string;
  options: CliOptionInfo[];
  input: Record<string, unknown>;
}

/**
 * Builds a safe, typed argv[] array from model input.
 * Avoids any shell string concatenation or shell injection.
 */
export class ArgvBuilder {
  build(opts: BuildArgvOptions): string[] {
    const argv: string[] = [opts.binary];

    if (opts.subcommand) {
      argv.push(opts.subcommand);
    }

    const optionsMap = new Map<string, CliOptionInfo>();
    for (const opt of opts.options) {
      optionsMap.set(opt.name, opt);
    }

    // Process options
    for (const [key, val] of Object.entries(opts.input)) {
      if (val === undefined || val === null || val === "") continue;

      const opt = optionsMap.get(key);
      if (opt) {
        if (opt.type === "boolean") {
          if (Boolean(val) === true) {
            argv.push(opt.flag);
          }
        } else {
          argv.push(opt.flag, String(val));
        }
      } else if (key === "args" && Array.isArray(val)) {
        // Positional arguments passed as an array
        for (const item of val) {
          if (item !== undefined && item !== null) {
            argv.push(String(item));
          }
        }
      } else if (!key.startsWith("_") && typeof val !== "object") {
        // Fallback flag format for unrecognized options
        const flagName = `--${key.replace(/_/g, "-")}`;
        if (typeof val === "boolean") {
          if (val) argv.push(flagName);
        } else {
          argv.push(flagName, String(val));
        }
      }
    }

    return argv;
  }
}
