import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic JSON-RPC validation
    if (body.jsonrpc !== "2.0" || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id ?? null,
          error: { code: -32600, message: "Invalid Request" },
        },
        { status: 400 }
      );
    }

    // Handle MCP methods
    switch (body.method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: {
              name: "omni-mcp-web",
              version: "0.1.0",
            },
          },
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [],
          },
        });

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`,
          },
        });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: err.message },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
