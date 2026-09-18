interface ToolCardItem {
  id: string;
  name: string;
  group: string;
  sourceType: string;
  description: string;
  executionType: "http" | "process";
  risk: "low" | "medium" | "critical";
  parameters: Array<{ name: string; type: string; required: boolean }>;
}

const mockTools: ToolCardItem[] = [
  {
    id: "tool_1",
    name: "list_pets",
    group: "pets",
    sourceType: "openapi",
    description: "List all pets in the store with optional status and pagination filters",
    executionType: "http",
    risk: "low",
    parameters: [
      { name: "limit", type: "integer", required: false },
      { name: "status", type: "string", required: false },
    ],
  },
  {
    id: "tool_2",
    name: "create_pet",
    group: "pets",
    sourceType: "openapi",
    description: "Add a new pet to the catalog with tags and metadata",
    executionType: "http",
    risk: "medium",
    parameters: [
      { name: "name", type: "string", required: true },
      { name: "tag", type: "string", required: false },
    ],
  },
  {
    id: "tool_3",
    name: "delete_pet",
    group: "pets",
    sourceType: "openapi",
    description: "Delete an existing pet by ID permanently",
    executionType: "http",
    risk: "critical",
    parameters: [{ name: "petId", type: "string", required: true }],
  },
  {
    id: "tool_4",
    name: "git_status",
    group: "git",
    sourceType: "cli",
    description: "Show working tree status including untracked, modified, and staged files",
    executionType: "process",
    risk: "low",
    parameters: [
      { name: "short", type: "boolean", required: false },
      { name: "branch", type: "boolean", required: false },
    ],
  },
  {
    id: "tool_5",
    name: "get_products",
    group: "E-Commerce Services/Products",
    sourceType: "postman",
    description: "Retrieve list of products by category and page limit",
    executionType: "http",
    risk: "low",
    parameters: [
      { name: "category", type: "string", required: false },
      { name: "limit", type: "string", required: false },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registered Tools</h1>
        <p className="text-sm text-muted-foreground">
          Explore and inspect all normalized AI tools generated across your MCP servers.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter tools by name, group, or keyword..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="all">All Groups</option>
          <option value="pets">pets</option>
          <option value="git">git</option>
          <option value="ecommerce">E-Commerce Services</option>
        </select>
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="all">All Risk Tiers</option>
          <option value="low">Low (Read-only)</option>
          <option value="medium">Medium (Mutation)</option>
          <option value="critical">Critical (Destructive)</option>
        </select>
      </div>

      <div className="grid gap-4">
        {mockTools.map((tool) => {
          const riskBadge =
            tool.risk === "low"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : tool.risk === "medium"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

          return (
            <div
              key={tool.id}
              className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground">
                      {tool.name}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${riskBadge}`}
                    >
                      {tool.risk}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {tool.group}
                    </span>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground uppercase font-mono">
                      {tool.executionType}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </div>

              {/* Arguments breakdown */}
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Parameters ({tool.parameters.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {tool.parameters.map((param) => (
                    <div
                      key={param.name}
                      className="rounded border border-border bg-muted/30 px-2.5 py-1 text-xs font-mono flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-foreground">
                        {param.name}
                      </span>
                      <span className="text-muted-foreground">
                        :{param.type}
                      </span>
                      {param.required && (
                        <span className="text-rose-500 text-[10px] uppercase font-bold">
                          req
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
