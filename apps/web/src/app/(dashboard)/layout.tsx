import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span>🔌</span>
            <span>Omni-MCP</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            📊 Overview
          </Link>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            📁 Projects
          </Link>
          <Link
            href="/dashboard/tools"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            🔧 Tools
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            ⚙️ Settings
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            Dashboard
          </h2>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
