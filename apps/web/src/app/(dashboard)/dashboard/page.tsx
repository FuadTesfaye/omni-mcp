import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Manage, inspect, and serve your universal Model Context Protocol capabilities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Projects
          </Link>
          <Link
            href="/dashboard/tools"
            className="rounded-md border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Explore Tools
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Projects", value: "3", icon: "📁", change: "+2 this week" },
          { label: "Registered Tools", value: "30", icon: "🔧", change: "Across 3 adapters" },
          { label: "Active Transports", value: "stdio & http", icon: "🔌", change: "Local & remote" },
          { label: "Avg Response", value: "48ms", icon: "⚡", change: "Sub-100ms execution" },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Adapters Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            name: "OpenAPI / Swagger",
            desc: "Parses endpoints, parameter schemas, and request bodies into typed MCP tools.",
            status: "Online",
            badge: "OpenAPI 3.x",
          },
          {
            name: "CLI / Binaries",
            desc: "Inspects CLI --help output, builds typed argv[] arrays, and executes securely.",
            status: "Online",
            badge: "Process Runner",
          },
          {
            name: "Postman Collections",
            desc: "Flattens requests, query params, path variables, and JSON payloads.",
            status: "Online",
            badge: "v2.0 & v2.1",
          },
        ].map((adapter, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{adapter.name}</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {adapter.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{adapter.desc}</p>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="rounded bg-muted px-2 py-1 text-[11px] font-mono text-muted-foreground">
                {adapter.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started Guide */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">CLI Quick Reference</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Omni-MCP turns any computational target into an AI capability from your terminal.
        </p>
        <div className="rounded-md bg-zinc-950 p-4 font-mono text-zinc-300 text-xs overflow-x-auto space-y-3">
          <div>
            <span className="text-zinc-500"># 1. MCPify an OpenAPI spec:</span>
            <p className="text-emerald-400">mcpify https://petstore3.swagger.io/api/v3/openapi.json</p>
          </div>
          <div>
            <span className="text-zinc-500"># 2. MCPify a Postman collection and generate a server manifest:</span>
            <p className="text-emerald-400">mcpify ./my-collection.json -o ./my-server</p>
          </div>
          <div>
            <span className="text-zinc-500"># 3. Serve tools for Claude Desktop or Cursor via stdio:</span>
            <p className="text-emerald-400">mcpify serve --manifest ./my-server/mcp.json --transport stdio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
