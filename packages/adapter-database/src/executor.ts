import { Database } from "bun:sqlite";
import type { ExecutionContext, ExecutionResult } from "@omni-mcp/types";

export interface SqlExecutionConfig {
  operation: "get" | "search" | "relationship" | "insert";
  table?: string;
  sourceTable?: string;
  sourceColumn?: string;
  targetTable?: string;
  targetColumn?: string;
  primaryKeys?: string[];
  maxLimit?: number;
}

export class DatabaseExecutor {
  async executeSqlite(
    dbPath: string,
    config: SqlExecutionConfig,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const db = new Database(dbPath, { readonly: config.operation !== "insert" });

      try {
        let result: unknown;

        if (config.operation === "get") {
          result = this.executeGet(db, config, input);
        } else if (config.operation === "search") {
          result = this.executeSearch(db, config, input);
        } else if (config.operation === "relationship") {
          result = this.executeRelationship(db, config, input);
        } else if (config.operation === "insert") {
          result = this.executeInsert(db, config, input);
        } else {
          throw new Error(`Unsupported database operation: ${config.operation}`);
        }

        return {
          success: true,
          data: result,
          metadata: {
            durationMs: Date.now() - startTime,
            source: "database",
            requestId: context.requestId,
          },
        };
      } finally {
        db.close();
      }
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "SQL_EXECUTION_ERROR",
          message: err.message,
          category: "upstream",
          retryable: false,
        },
        metadata: {
          durationMs: Date.now() - startTime,
          source: "database",
          requestId: context.requestId,
        },
      };
    }
  }

  private executeGet(db: Database, config: SqlExecutionConfig, input: Record<string, unknown>): unknown {
    const table = this.sanitizeIdentifier(config.table!);
    const pks = config.primaryKeys || [];

    const whereClauses: string[] = [];
    const values: any[] = [];

    for (const pk of pks) {
      const val = input[pk];
      if (val !== undefined) {
        whereClauses.push(`"${this.sanitizeIdentifier(pk)}" = ?`);
        values.push(val);
      }
    }

    if (whereClauses.length === 0) {
      throw new Error(`Missing required primary key parameters: ${pks.join(", ")}`);
    }

    const sql = `SELECT * FROM "${table}" WHERE ${whereClauses.join(" AND ")} LIMIT 1`;
    return db.query(sql).get(...values);
  }

  private executeSearch(db: Database, config: SqlExecutionConfig, input: Record<string, unknown>): unknown[] {
    const table = this.sanitizeIdentifier(config.table!);
    const limit = Math.min(Number(input.limit) || 20, config.maxLimit || 100);
    const offset = Math.max(Number(input.offset) || 0, 0);

    const whereClauses: string[] = [];
    const values: any[] = [];

    for (const [k, v] of Object.entries(input)) {
      if (k === "limit" || k === "offset") continue;
      if (v !== undefined && v !== null && v !== "") {
        whereClauses.push(`"${this.sanitizeIdentifier(k)}" = ?`);
        values.push(v);
      }
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const sql = `SELECT * FROM "${table}" ${whereStr} LIMIT ? OFFSET ?`;

    return db.query(sql).all(...values, limit, offset);
  }

  private executeRelationship(db: Database, config: SqlExecutionConfig, input: Record<string, unknown>): unknown[] {
    const sourceTable = this.sanitizeIdentifier(config.sourceTable!);
    const sourceColumn = this.sanitizeIdentifier(config.sourceColumn!);
    const targetColumn = this.sanitizeIdentifier(config.targetColumn!);

    const val = input[targetColumn];
    if (val === undefined) {
      throw new Error(`Missing target key value for ${targetColumn}`);
    }

    const sql = `SELECT * FROM "${sourceTable}" WHERE "${sourceColumn}" = ? LIMIT 100`;
    return db.query(sql).all(val as any);
  }

  private executeInsert(db: Database, config: SqlExecutionConfig, input: Record<string, unknown>): unknown {
    const table = this.sanitizeIdentifier(config.table!);
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) {
        columns.push(`"${this.sanitizeIdentifier(k)}"`);
        placeholders.push("?");
        values.push(v);
      }
    }

    if (columns.length === 0) {
      throw new Error("No data provided for insert");
    }

    const sql = `INSERT INTO "${table}" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
    const res = db.run(sql, values);

    return {
      lastInsertRowid: res.lastInsertRowid,
      changes: res.changes,
    };
  }

  private sanitizeIdentifier(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error(`Invalid SQL identifier: ${name}`);
    }
    return name;
  }
}
