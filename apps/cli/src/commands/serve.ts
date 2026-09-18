import chalk from "chalk";
import { MCPGateway, connectStdio, startHttpTransport } from "@omni-mcp/mcp";
import { McpifyPipeline, AdapterRegistry } from "@omni-mcp/core";
import { OpenApiAdapter } from "@omni-mcp/adapter-openapi";
import { CliAdapter } from "@omni-mcp/adapter-cli";
import { PostmanAdapter } from "@omni-mcp/adapter-postman";
import { DatabaseAdapter } from "@omni-mcp/adapter-database";
import type { IntermediateToolDefinition } from "@omni-mcp/types";

export async function serveCommand(options: {
  transport: string;
  port: string;
  manifest: string;
}) {
  const fs = await import("fs/promises");
  const path = await import("path");

  let manifestPath = options.manifest || "./mcp.json";

  // Check fallbacks if default path doesn't exist
  try {
    await fs.stat(manifestPath);
  } catch {
    const fallbackPath = path.join(process.cwd(), ".mcp", "mcp.json");
    try {
      await fs.stat(fallbackPath);
      manifestPath = fallbackPath;
    } catch {
      console.error(
        chalk.red(`Error: Manifest not found at ${manifestPath} or ${fallbackPath}`)
      );
      console.log(
        chalk.gray(
          "Generate a manifest first with:\n  mcpify <source> -o ./my-server"
        )
      );
      process.exit(1);
    }
  }

  let manifest: {
    name?: string;
    version?: string;
    tools: IntermediateToolDefinition[];
  };

  try {
    const content = await fs.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(content);
  } catch (err: any) {
    console.error(chalk.red(`Error reading manifest: ${err.message}`));
    process.exit(1);
  }

  if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
    console.error(chalk.red("Error: Manifest contains no tools"));
    process.exit(1);
  }

  // Set up pipeline execution
  const registry = new AdapterRegistry();
  registry.register(new OpenApiAdapter());
  registry.register(new CliAdapter());
  registry.register(new PostmanAdapter());
  registry.register(new DatabaseAdapter());
  const pipeline = new McpifyPipeline(registry);

  const serverName = manifest.name || "omni-mcp-server";
  const serverVersion = manifest.version || "0.1.0";

  const gateway = new MCPGateway(
    serverName,
    serverVersion,
    (tool, input, context) => pipeline.execute(tool, input, context)
  );

  gateway.registerTools(manifest.tools);

  const transport = options.transport || "stdio";

  if (transport === "http") {
    const port = parseInt(options.port || "3001");
    console.log(chalk.bold(`\n🔌 Serving ${serverName} (${manifest.tools.length} tools) via HTTP\n`));
    await startHttpTransport(gateway, { port });
  } else {
    // stdio transport (no extra console logs to avoid corrupting JSON-RPC stream)
    await connectStdio(gateway);
  }
}
