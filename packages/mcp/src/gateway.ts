import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
} from "@omni-mcp/types";
import { randomUUID } from "crypto";

export type ToolExecutor = (
  tool: IntermediateToolDefinition,
  input: Record<string, unknown>,
  context: ExecutionContext
) => Promise<ExecutionResult>;

/**
 * The MCP Gateway wraps the low-level MCP SDK Server
 * and dynamically registers tools from IntermediateToolDefinitions.
 *
 * Uses the low-level Server API to accept raw JSON Schema
 * directly from adapters without Zod conversion.
 */
export class MCPGateway {
  private server: Server;
  private tools = new Map<string, IntermediateToolDefinition>();
  private executor: ToolExecutor;

  constructor(name: string, version: string, executor: ToolExecutor) {
    this.executor = executor;

    this.server = new Server(
      { name, version },
      { capabilities: { tools: {} } }
    );

    // Register MCP protocol handlers
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: Array.from(this.tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as any,
        })),
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args = {} } = request.params;
        const tool = this.tools.get(name);

        if (!tool) {
          return {
            isError: true,
            content: [
              { type: "text" as const, text: `Unknown tool: ${name}` },
            ],
          };
        }

        const context: ExecutionContext = {
          requestId: randomUUID(),
          timeoutMs: 30000,
        };

        const result = await this.executor(
          tool,
          args as Record<string, unknown>,
          context
        );

        if (!result.success) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result.error, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text:
                typeof result.data === "string"
                  ? result.data
                  : JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }
    );
  }

  /** Register tools from the mcpify pipeline */
  registerTools(tools: IntermediateToolDefinition[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  /** Get the underlying MCP Server for transport connection */
  getServer(): Server {
    return this.server;
  }

  /** Get count of registered tools */
  getToolCount(): number {
    return this.tools.size;
  }
}
