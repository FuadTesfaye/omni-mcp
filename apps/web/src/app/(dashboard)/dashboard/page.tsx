export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Omni-MCP. Manage your MCPified projects and tools.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Projects", value: "0", icon: "📁" },
          { label: "Total Tools", value: "0", icon: "🔧" },
          { label: "Active Connections", value: "0", icon: "🔌" },
          { label: "Tool Calls (24h)", value: "0", icon: "📊" },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Getting Started */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Start by MCPifying your first API, CLI, or database from the
            terminal:
          </p>
          <div className="rounded-md bg-zinc-950 p-4 font-mono text-zinc-300 text-xs overflow-x-auto">
            <code>{`# MCPify an OpenAPI spec
mcpify https://petstore3.swagger.io/api/v3/openapi.json

# Inspect discovered capabilities
mcpify inspect ./my-api.json

# Serve as MCP server for Claude Desktop
mcpify ./my-api.json --serve --transport stdio`}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
