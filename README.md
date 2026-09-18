# 🔌 Omni-MCP

**MCPify Anything** — Turn any API, CLI, database, website, SDK, or codebase into a production-ready MCP server.

## What is Omni-MCP?

Omni-MCP is a universal adapter engine that converts arbitrary computational surfaces into secure, dynamically discoverable [Model Context Protocol (MCP)](https://modelcontextprotocol.io) capabilities.

```bash
# Point at an OpenAPI spec → get a working MCP server
mcpify https://api.example.com/openapi.json

# Point at a CLI tool
mcpify ffmpeg

# Point at a database
mcpify postgres://localhost/mydb

# Point at a website
mcpify https://internal.company.local
```

## Quick Start

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run the CLI
cd apps/cli && bun run src/index.ts https://petstore3.swagger.io/api/v3/openapi.json

# Start the web app
cd apps/web && bun dev
```

## Architecture

Omni-MCP uses a four-layer pipeline architecture:

1. **Ingestion & Introspection** — Understand the target system
2. **Semantic Synthesis** — Design AI-friendly tools
3. **Runtime & Execution** — Execute safely with auth, sandboxing, and validation
4. **MCP Gateway** — Expose via tools, resources, prompts over stdio/HTTP

## Project Structure

```
omni-mcp/
├── apps/
│   ├── cli/              # mcpify CLI application
│   └── web/              # Next.js 15 web app (landing + dashboard)
├── packages/
│   ├── types/            # Canonical IR types
│   ├── core/             # Engine core (detector, registry, pipeline)
│   ├── mcp/              # MCP gateway (Server wrapper, transports)
│   ├── adapter-openapi/  # OpenAPI/Swagger adapter
│   ├── typescript-config/ # Shared TypeScript configs
│   └── eslint-config/    # Shared ESLint config
├── turbo.json            # Turborepo configuration
└── package.json          # Workspace root
```

## Supported Targets (Phase 1)

- ✅ OpenAPI / Swagger specifications
- 🔜 CLI tools
- 🔜 Postman collections
- 🔜 PostgreSQL / MySQL / SQLite
- 🔜 GraphQL
- 🔜 TypeScript/Python repositories
- 🔜 Websites (Playwright)

## License

MIT
