import type {
  OmniAdapter,
  AdapterTarget,
  DetectionResult,
  InspectionResult,
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
} from "@omni-mcp/types";
import { DatabaseIntrospector, type DatabaseSchema } from "./introspector.js";
import { DatabaseToolSynthesizer } from "./synthesizer.js";
import { DatabaseExecutor, type SqlExecutionConfig } from "./executor.js";
import { DEFAULT_DATABASE_POLICY, type DatabaseSecurityPolicy } from "./policy.js";

export class DatabaseAdapter implements OmniAdapter {
  name = "database";
  description = "Adapter for relational databases (SQLite, PostgreSQL, MySQL) with semantic tool generation";
  sourceTypes = ["database", "database-sqlite", "database-postgres", "database-mysql"];

  private introspector = new DatabaseIntrospector();
  private synthesizer = new DatabaseToolSynthesizer();
  private executor = new DatabaseExecutor();
  private policy: DatabaseSecurityPolicy;

  constructor(policy: Partial<DatabaseSecurityPolicy> = {}) {
    this.policy = { ...DEFAULT_DATABASE_POLICY, ...policy };
  }

  async detect(input: AdapterTarget): Promise<DetectionResult> {
    const raw = input.raw.trim();

    if (input.type && input.type.startsWith("database")) {
      return { detected: true, confidence: 1.0, type: input.type };
    }

    // URI schemes
    if (/^sqlite:\/\//i.test(raw)) {
      return { detected: true, confidence: 0.95, type: "database-sqlite" };
    }
    if (/^(postgres|postgresql):\/\//i.test(raw)) {
      return { detected: true, confidence: 0.95, type: "database-postgres" };
    }
    if (/^mysql:\/\//i.test(raw)) {
      return { detected: true, confidence: 0.95, type: "database-mysql" };
    }

    // SQLite file paths
    if (/\.(db|sqlite|sqlite3)$/i.test(raw)) {
      try {
        const fs = await import("fs/promises");
        const stat = await fs.stat(raw);
        if (stat.isFile()) {
          return { detected: true, confidence: 0.98, type: "database-sqlite" };
        }
      } catch {
        // File doesn't exist yet or not accessible
      }
    }

    return { detected: false, confidence: 0 };
  }

  async inspect(input: AdapterTarget): Promise<InspectionResult> {
    const dbPath = this.resolveDbPath(input.raw);
    const schema = this.introspector.introspectSqlite(dbPath, this.policy);

    const capabilities = schema.tables.map((t) => ({
      name: t.name,
      description: `Table ${t.name} with ${t.columns.length} columns (${t.primaryKeys.join(", ") || "no PK"})`,
      rawSchema: t,
      confidence: "confirmed" as const,
      tags: [t.name],
    }));

    return {
      source: input.raw,
      sourceType: schema.databaseType,
      capabilities,
      metadata: {
        schema,
        dbPath,
        tableCount: schema.tables.length,
        relationshipCount: schema.relationships.length,
      },
    };
  }

  async synthesize(inspection: InspectionResult): Promise<IntermediateToolDefinition[]> {
    const schema = inspection.metadata.schema as DatabaseSchema;
    return this.synthesizer.synthesize(schema, inspection.source, this.policy);
  }

  async execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const config = tool.execution.config as unknown as SqlExecutionConfig;
    const dbPath = this.resolveDbPath(tool.source.identifier);

    return this.executor.executeSqlite(dbPath, config, input, context);
  }

  private resolveDbPath(raw: string): string {
    if (raw.startsWith("sqlite://")) {
      return raw.replace(/^sqlite:\/\//, "");
    }
    return raw;
  }
}

export { DatabaseIntrospector } from "./introspector.js";
export { DatabaseToolSynthesizer } from "./synthesizer.js";
export { DatabaseExecutor } from "./executor.js";
export { DEFAULT_DATABASE_POLICY } from "./policy.js";
export type { DatabaseSecurityPolicy } from "./policy.js";
