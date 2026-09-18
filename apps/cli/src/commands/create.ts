import ora from "ora";
import chalk from "chalk";
import { McpifyPipeline, AdapterRegistry } from "@omni-mcp/core";
import { OpenApiAdapter } from "@omni-mcp/adapter-openapi";
import { CliAdapter } from "@omni-mcp/adapter-cli";
import { PostmanAdapter } from "@omni-mcp/adapter-postman";
import { MCPGateway, connectStdio, startHttpTransport } from "@omni-mcp/mcp";

export async function createCommand(
  source: string | undefined,
  options: {
    type?: string;
    output?: string;
    serve?: boolean;
    transport?: string;
    port?: string;
  }
) {
  if (!source) {
    console.error(chalk.red("Error: Please provide a source to MCPify"));
    console.log(
      chalk.gray(
        "  Example: mcpify https://api.example.com/openapi.json"
      )
    );
    console.log(chalk.gray("  Example: mcpify ./my-api.json"));
    console.log(chalk.gray("  Example: mcpify ./my-collection.postman_collection.json"));
    console.log(chalk.gray("  Example: mcpify git"));
    process.exit(1);
  }

  console.log(chalk.bold("\n\u{1F50C} Omni-MCP \u2014 MCPify Anything\n"));

  // Step 1: Setup
  const registry = new AdapterRegistry();
  registry.register(new OpenApiAdapter());
  registry.register(new CliAdapter());
  registry.register(new PostmanAdapter());

  const pipeline = new McpifyPipeline(registry);

  // Step 2: Detect & Process
  const detectSpinner = ora("Detecting target...").start();

  try {
    const result = await pipeline.run({
      raw: source,
      type: options.type,
    });

    detectSpinner.succeed(
      `${chalk.green("\u2713")} ${result.sourceType} detected`
    );

    // Step 3: Report
    console.log(chalk.gray(`\n  Source: ${result.source}`));
    console.log(chalk.gray(`  Type: ${result.sourceType}`));
    console.log();

    console.log(chalk.bold("  Discovered:"));
    console.log(
      chalk.gray(`    ${result.stats.discovered} capabilities found`)
    );
    console.log();

    console.log(chalk.bold("  Generated:"));
    console.log(chalk.green(`    ${result.stats.generated} MCP tools`));
    console.log(
      chalk.gray(
        `    ${result.stats.groups.length} capability groups`
      )
    );
    console.log();

    console.log(chalk.bold("  Security analysis:"));
    console.log(
      chalk.green(`    ${result.stats.readTools} read-only`)
    );
    if (result.stats.mutationTools > 0) {
      console.log(
        chalk.yellow(`    ${result.stats.mutationTools} mutation`)
      );
    }
    if (result.stats.destructiveTools > 0) {
      console.log(
        chalk.red(`    ${result.stats.destructiveTools} destructive`)
      );
    }
    // Step 4: Write manifest if output directory specified
    if (options.output) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const outDir = options.output;
      await fs.mkdir(outDir, { recursive: true });
      const manifestPath = path.join(outDir, "mcp.json");
      const manifest = {
        name: result.tools[0]?.metadata.group || "omni-mcp-server",
        version: "0.1.0",
        source: result.source,
        sourceType: result.sourceType,
        stats: result.stats,
        tools: result.tools,
        generatedAt: new Date().toISOString(),
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(chalk.green(`  Manifest generated at: ${manifestPath}\n`));
    }

    // Step 5: Serve if requested
    if (options.serve) {
      const gateway = new MCPGateway(
        "omni-mcp",
        "0.1.0",
        (tool, input, context) => pipeline.execute(tool, input, context)
      );

      gateway.registerTools(result.tools);

      const transport = options.transport || "stdio";

      if (transport === "http") {
        console.log(chalk.bold("  Starting HTTP MCP server..."));
        await startHttpTransport(gateway, {
          port: parseInt(options.port || "3001"),
        });
      } else {
        console.log(chalk.bold("  Starting stdio MCP server..."));
        console.log(
          chalk.gray(
            "  (Connect this to Claude Desktop or Cursor)"
          )
        );
        await connectStdio(gateway);
      }
    } else {
      console.log(chalk.bold("  MCP server ready.\n"));
      console.log(chalk.gray("  Run:"));
      console.log(
        chalk.cyan(
          `    mcpify ${source} --serve --transport stdio`
        )
      );
      console.log(
        chalk.cyan(
          `    mcpify ${source} --serve --transport http --port 3001`
        )
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    detectSpinner.fail(chalk.red("Failed"));
    console.error(chalk.red(`\n  Error: ${err.message}`));
    process.exit(1);
  }
}
