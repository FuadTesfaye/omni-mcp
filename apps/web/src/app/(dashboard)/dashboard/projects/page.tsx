import Link from "next/link";

interface ProjectItem {
  id: string;
  name: string;
  source: string;
  sourceType: "openapi" | "postman" | "cli";
  toolCount: number;
  readCount: number;
  mutationCount: number;
  destructiveCount: number;
  status: "active" | "ready";
  updatedAt: string;
}

const mockProjects: ProjectItem[] = [
  {
    id: "proj_1",
    name: "Petstore API",
    source: "https://petstore3.swagger.io/api/v3/openapi.json",
    sourceType: "openapi",
    toolCount: 19,
    readCount: 11,
    mutationCount: 6,
    destructiveCount: 2,
    status: "active",
    updatedAt: "Just now",
  },
  {
    id: "proj_2",
    name: "E-Commerce Services",
    source: "./examples/sample-postman.json",
    sourceType: "postman",
    toolCount: 3,
    readCount: 1,
    mutationCount: 1,
    destructiveCount: 1,
    status: "ready",
    updatedAt: "10 mins ago",
  },
  {
    id: "proj_3",
    name: "Git CLI Server",
    source: "git",
    sourceType: "cli",
    toolCount: 8,
    readCount: 4,
    mutationCount: 4,
    destructiveCount: 0,
    status: "active",
    updatedAt: "1 hour ago",
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your registered MCP targets, adapters, and schemas.
          </p>
        </div>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          + New Project
        </button>
      </div>

      <div className="grid gap-4">
        {mockProjects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{project.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      project.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {project.status.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground uppercase">
                    {project.sourceType}
                  </span>
                </div>
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  {project.source}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/tools"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Inspect Tools
                </Link>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-6 border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {project.toolCount}
                </span>{" "}
                Tools Total
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>{project.readCount} Read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span>{project.mutationCount} Mutation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                <span>{project.destructiveCount} Destructive</span>
              </div>
              <div className="ml-auto text-xs">Updated {project.updatedAt}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
