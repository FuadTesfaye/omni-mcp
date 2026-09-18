import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { MCPGateway } from "../gateway.js";

/**
 * Connect the MCP gateway to stdio transport
 * for local Claude Desktop / Cursor integration.
 */
export async function connectStdio(gateway: MCPGateway): Promise<void> {
  const transport = new StdioServerTransport();
  await gateway.getServer().connect(transport);
}
