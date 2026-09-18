export interface CliCommandInfo {
  name: string;
  description: string;
  subcommands: CliSubcommandInfo[];
  options: CliOptionInfo[];
  arguments: CliArgumentInfo[];
}

export interface CliSubcommandInfo {
  name: string;
  description: string;
  options: CliOptionInfo[];
  arguments: CliArgumentInfo[];
}

export interface CliOptionInfo {
  name: string;
  flag: string;
  shortFlag?: string;
  description: string;
  type: "string" | "boolean" | "number";
  required: boolean;
  defaultValue?: string;
}

export interface CliArgumentInfo {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "number";
}

/**
 * Analyzes CLI help output using regular expressions and pattern matching.
 */
export class CliAnalyzer {
  /**
   * Parse `--help` text into structured command information.
   */
  parseHelpText(commandName: string, helpText: string): CliCommandInfo {
    const lines = helpText.split("\n");
    const subcommands: CliSubcommandInfo[] = [];
    const options: CliOptionInfo[] = [];
    const args: CliArgumentInfo[] = [];

    let currentSection: "description" | "usage" | "commands" | "options" | "arguments" | "other" = "other";
    const descriptionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Section header detection
      if (/^(commands|subcommands|available commands):/i.test(trimmed)) {
        currentSection = "commands";
        continue;
      }
      if (/^(options|flags|arguments and options|global options):/i.test(trimmed)) {
        currentSection = "options";
        continue;
      }
      if (/^(arguments|positional arguments|args):/i.test(trimmed)) {
        currentSection = "arguments";
        continue;
      }
      if (/^(usage|synopsis):/i.test(trimmed)) {
        currentSection = "usage";
        continue;
      }

      if (!trimmed) continue;

      if (currentSection === "commands") {
        const sub = this.parseCommandRow(line);
        if (sub) {
          subcommands.push({
            name: sub.name,
            description: sub.description,
            options: [],
            arguments: [],
          });
        }
      } else if (currentSection === "options") {
        const opt = this.parseOptionRow(line);
        if (opt) {
          options.push(opt);
        }
      } else if (currentSection === "arguments") {
        const arg = this.parseArgumentRow(line);
        if (arg) {
          args.push(arg);
        }
      } else if (currentSection === "usage" || currentSection === "other") {
        if (i < 5 && !trimmed.startsWith("-") && !trimmed.startsWith("$")) {
          descriptionLines.push(trimmed);
        }
      }
    }

    const description = descriptionLines.length > 0 ? descriptionLines.join(" ") : `CLI program: ${commandName}`;

    return {
      name: commandName,
      description,
      subcommands,
      options,
      arguments: args,
    };
  }

  private parseOptionRow(line: string): CliOptionInfo | null {
    // Pattern: -s, --long <val>  Description
    // Pattern: --long=<val>      Description
    // Pattern: --long            Description
    const optionRegex = /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9_-]+)(?:[=\s]+[<\[]([a-zA-Z0-9_-]+)[>\]])?\s{2,}(.*)$/;
    const match = line.match(optionRegex);

    if (match) {
      const shortFlag = match[1];
      const flag = match[2];
      const paramName = match[3];
      const desc = match[4]?.trim() || "";

      const cleanName = flag.replace(/^--/, "").replace(/-/g, "_");
      const isNumber = /number|port|count|timeout|limit/i.test(paramName || cleanName);
      const isBoolean = !paramName;

      return {
        name: cleanName,
        flag,
        shortFlag,
        description: desc,
        type: isNumber ? "number" : isBoolean ? "boolean" : "string",
        required: desc.toLowerCase().includes("required"),
      };
    }

    return null;
  }

  private parseCommandRow(line: string): { name: string; description: string } | null {
    // Pattern: subcommand    Description of the subcommand
    const cmdRegex = /^\s{1,8}([a-zA-Z0-9_-]+)\s{2,}(.+)$/;
    const match = line.match(cmdRegex);

    if (match && !match[1].startsWith("-")) {
      return {
        name: match[1],
        description: match[2].trim(),
      };
    }

    return null;
  }

  private parseArgumentRow(line: string): CliArgumentInfo | null {
    // Pattern: ARG_NAME   Description
    const argRegex = /^\s{1,8}([a-zA-Z0-9_<>-]+)\s{2,}(.+)$/;
    const match = line.match(argRegex);

    if (match && !match[1].startsWith("-")) {
      const cleanName = match[1].replace(/[<>[\]]/g, "").toLowerCase();
      return {
        name: cleanName,
        description: match[2].trim(),
        required: !match[1].includes("["),
        type: /number|port|id|count/i.test(cleanName) ? "number" : "string",
      };
    }

    return null;
  }
}
