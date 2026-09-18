#!/usr/bin/env bun
import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { inspectCommand } from "./commands/inspect.js";
import { serveCommand } from "./commands/serve.js";

const program = new Command()
  .name("mcpify")
  .description(
    "MCPify anything — Turn any API, CLI, database, or app into an MCP server"
  )
  .version("0.1.0");

// Default command: mcpify <source>
program
  .argument(
    "[source]",
    "Target to MCPify (URL, file, connection string, command)"
  )
  .option("-t, --type <type>", "Explicit target type override")
  .option("-o, --output <dir>", "Output directory for generated server")
  .option("--serve", "Immediately serve after creation")
  .option(
    "--transport <transport>",
    "Transport type: stdio | http",
    "stdio"
  )
  .option("--port <port>", "HTTP port (when transport=http)", "3001")
  .action(createCommand);

// Inspect subcommand
program
  .command("inspect <source>")
  .description("Inspect a target and show discovered capabilities")
  .option("-t, --type <type>", "Explicit target type override")
  .action(inspectCommand);

// Serve subcommand
program
  .command("serve")
  .description("Serve an MCP server from a manifest")
  .option("--transport <transport>", "Transport: stdio | http", "stdio")
  .option("--port <port>", "HTTP port", "3001")
  .option("--manifest <path>", "Path to mcp.json manifest", "./mcp.json")
  .action(serveCommand);

program.parse();
