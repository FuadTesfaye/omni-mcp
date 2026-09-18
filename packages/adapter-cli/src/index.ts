import type {
  OmniAdapter,
  AdapterTarget,
  DetectionResult,
  InspectionResult,
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
  JsonSchema,
} from "@omni-mcp/types";
import { CliAnalyzer, type CliCommandInfo, type CliSubcommandInfo } from "./analyzer.js";
import { ArgvBuilder } from "./builder.js";
import { executeCliProcess } from "./executor.js";
import { execSync } from "child_process";
import { randomUUID } from "crypto";

export class CliAdapter implements OmniAdapter {
  name = "cli";
  description = "Adapter for CLI utilities, binaries, and command-line programs";
  sourceTypes = ["cli"];

  private analyzer = new CliAnalyzer();
  private builder = new ArgvBuilder();

  async detect(input: AdapterTarget): Promise<DetectionResult> {
    const raw = input.raw.trim();

    // Direct override
    if (input.type === "cli") {
      return { detected: true, confidence: 1.0, type: "cli" };
    }

    // Ignore URLs, DB URIs, and JSON/YAML spec files
    if (/^(https?|postgres|postgresql|mysql|sqlite|mongodb):\/\//i.test(raw)) {
      return { detected: false, confidence: 0 };
    }
    if (/\.(json|ya?ml|proto)$/i.test(raw)) {
      return { detected: false, confidence: 0 };
    }

    // Check if binary exists in PATH or is executable on disk
    try {
      execSync(`which ${raw.split(" ")[0]}`, { stdio: "pipe" });
      return {
        detected: true,
        confidence: 0.85,
        type: "cli",
        metadata: { command: raw },
      };
    } catch {
      // Check local file permissions
      try {
        const fs = await import("fs/promises");
        const stat = await fs.stat(raw);
        if (stat.isFile() && (stat.mode & 0o111)) {
          return {
            detected: true,
            confidence: 0.9,
            type: "cli",
            metadata: { binary: raw },
          };
        }
      } catch {
        // Not a file
      }
    }

    return { detected: false, confidence: 0 };
  }

  async inspect(input: AdapterTarget): Promise<InspectionResult> {
    const command = input.raw.trim();
    let helpText = "";

    // Try --help then -h
    try {
      helpText = execSync(`${command} --help`, { stdio: "pipe" }).toString("utf-8");
    } catch (err: any) {
      try {
        helpText = execSync(`${command} -h`, { stdio: "pipe" }).toString("utf-8");
      } catch {
        helpText = err.stdout?.toString("utf-8") || err.message || "";
      }
    }

    const commandInfo = this.analyzer.parseHelpText(command, helpText);

    const capabilities = commandInfo.subcommands.length > 0
      ? commandInfo.subcommands.map((sub) => ({
          name: `${command}_${sub.name}`,
          description: sub.description,
          rawSchema: sub,
          confidence: "confirmed" as const,
          tags: [command],
        }))
      : [
          {
            name: command,
            description: commandInfo.description,
            rawSchema: commandInfo,
            confidence: "confirmed" as const,
            tags: [command],
          },
        ];

    return {
      source: command,
      sourceType: "cli",
      capabilities,
      metadata: {
        commandInfo,
        subcommandCount: commandInfo.subcommands.length,
        optionCount: commandInfo.options.length,
      },
    };
  }

  async synthesize(inspection: InspectionResult): Promise<IntermediateToolDefinition[]> {
    const commandInfo = inspection.metadata.commandInfo as CliCommandInfo;
    const tools: IntermediateToolDefinition[] = [];

    if (commandInfo.subcommands.length > 0) {
      for (const sub of commandInfo.subcommands) {
        tools.push(this.synthesizeSubcommand(commandInfo.name, sub));
      }
    } else {
      tools.push(this.synthesizeCommand(commandInfo));
    }

    return tools;
  }

  private synthesizeCommand(info: CliCommandInfo): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const opt of info.options) {
      properties[opt.name] = {
        type: opt.type,
        description: opt.description || `Flag ${opt.flag}`,
      };
      if (opt.required) required.push(opt.name);
    }

    // Add positional arguments property if arguments exist
    if (info.arguments.length > 0) {
      properties["args"] = {
        type: "array",
        items: { type: "string" },
        description: `Positional arguments: ${info.arguments.map((a) => a.name).join(", ")}`,
      };
    }

    const toolName = info.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: info.name,
      description: info.description || `Execute ${info.name}`,
      source: {
        type: "cli",
        identifier: info.name,
        originalName: info.name,
      },
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      execution: {
        type: "process",
        config: {
          binary: info.name,
          options: info.options,
        },
      },
      risk: {
        level: "medium",
        actions: ["process", "cli"],
      },
      metadata: {
        tags: ["cli", info.name],
        confidence: 0.85,
        generated: true,
        group: info.name,
      },
    };
  }

  private synthesizeSubcommand(binary: string, sub: CliSubcommandInfo): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const opt of sub.options) {
      properties[opt.name] = {
        type: opt.type,
        description: opt.description || `Flag ${opt.flag}`,
      };
      if (opt.required) required.push(opt.name);
    }

    if (sub.arguments.length > 0) {
      properties["args"] = {
        type: "array",
        items: { type: "string" },
        description: `Positional arguments: ${sub.arguments.map((a) => a.name).join(", ")}`,
      };
    }

    const toolName = `${binary}_${sub.name}`.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: `${binary} ${sub.name}`,
      description: sub.description || `Execute ${binary} ${sub.name}`,
      source: {
        type: "cli",
        identifier: binary,
        originalName: `${binary} ${sub.name}`,
      },
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      execution: {
        type: "process",
        config: {
          binary,
          subcommand: sub.name,
          options: sub.options,
        },
      },
      risk: {
        level: "medium",
        actions: ["process", "cli", sub.name],
      },
      metadata: {
        tags: ["cli", binary, sub.name],
        confidence: 0.85,
        generated: true,
        group: binary,
      },
    };
  }

  async execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const config = tool.execution.config as {
      binary: string;
      subcommand?: string;
      options: any[];
    };

    const argv = this.builder.build({
      binary: config.binary,
      subcommand: config.subcommand,
      options: config.options || [],
      input,
    });

    return executeCliProcess(
      {
        binary: config.binary,
        subcommand: config.subcommand,
        argv,
        timeoutMs: context.timeoutMs,
      },
      context
    );
  }
}

export { CliAnalyzer } from "./analyzer.js";
export { ArgvBuilder } from "./builder.js";
export { executeCliProcess } from "./executor.js";
