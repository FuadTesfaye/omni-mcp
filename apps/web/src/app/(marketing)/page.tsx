import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm mb-6 text-muted-foreground">
          🔌 Open Source Universal MCP Adapter
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl">
          MCPify{" "}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Anything
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl">
          Turn any API, CLI, database, website, SDK, or codebase into a
          production-ready MCP server. One command. Zero boilerplate.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="https://github.com/FuadTesfaye/omni-mcp"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            GitHub →
          </Link>
        </div>

        {/* Terminal Demo */}
        <div className="mt-16 w-full max-w-2xl">
          <div className="rounded-lg border border-border bg-zinc-950 text-left overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-zinc-500">Terminal</span>
            </div>
            <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
              <code>{`$ mcpify https://api.example.com/openapi.json

Detecting target...
✓ OpenAPI detected

Inspecting...
✓ 124 endpoints found

Designing tools...
✓ 68 useful tools generated

Optimizing...
✓ 68 indexed
✓ 7 capability groups

Security analysis...
✓ 41 read
! 19 mutation
! 8 destructive

MCP server ready.

Run:
  mcpify serve`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            What Can You MCPify?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🌐",
                title: "REST APIs",
                desc: "OpenAPI, Swagger, or raw REST endpoints",
              },
              {
                icon: "⌨️",
                title: "CLI Tools",
                desc: "Any command-line program with --help",
              },
              {
                icon: "🗄️",
                title: "Databases",
                desc: "PostgreSQL, MySQL, SQLite, MongoDB",
              },
              {
                icon: "📦",
                title: "SDKs",
                desc: "TypeScript, Python, Go packages",
              },
              {
                icon: "🌍",
                title: "Websites",
                desc: "Internal dashboards and web UIs",
              },
              {
                icon: "📋",
                title: "Postman",
                desc: "Collections and environments",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">How It Works</h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            Omni-MCP uses a four-layer pipeline to transform any computational
            surface into AI-native capabilities.
          </p>
          <div className="flex flex-col items-center gap-4 text-left max-w-lg mx-auto">
            {[
              "1. Point at anything — API, CLI, database, website",
              "2. Omni-MCP introspects and discovers capabilities",
              "3. Capabilities are normalized into AI-friendly tools",
              "4. Tools are validated and security-classified",
              "5. A production-ready MCP server is generated",
              "6. Connect your AI agent and go",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border p-4 w-full hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground font-mono">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to MCPify?</h2>
          <p className="text-muted-foreground mb-8">
            Get started in seconds. One command is all you need.
          </p>
          <div className="inline-flex items-center rounded-lg bg-zinc-950 px-6 py-3 text-sm font-mono text-zinc-300">
            <span className="text-zinc-500 mr-2">$</span>
            bun add -g omni-mcp && mcpify ./your-api.json
          </div>
        </div>
      </section>
    </div>
  );
}
