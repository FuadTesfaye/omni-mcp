import type { MCPGateway } from "../gateway.js";
import { createServer } from "http";

export interface HttpTransportOptions {
  port: number;
  stateless?: boolean;
}

/**
 * Start an HTTP server for remote MCP transport.
 * Simple JSON-RPC endpoint for Phase 1.
 */
export async function startHttpTransport(
  gateway: MCPGateway,
  options: HttpTransportOptions
): Promise<void> {
  const { port } = options;

  const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          tools: gateway.getToolCount(),
        })
      );
      return;
    }

    // Only accept POST to /mcp
    if (req.url !== "/mcp" || req.method !== "POST") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    // Read body
    let bodyStr = "";
    for await (const chunk of req) {
      bodyStr += chunk;
    }

    try {
      const body = JSON.parse(bodyStr);

      // Basic JSON-RPC pass-through
      // In Phase 2+, this will use StreamableHTTPServerTransport
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: {
            message: "MCP HTTP transport ready",
            tools: gateway.getToolCount(),
          },
        })
      );
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })
      );
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`MCP HTTP server running on http://localhost:${port}/mcp`);
      resolve();
    });
  });
}
