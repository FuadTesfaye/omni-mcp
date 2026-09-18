import { Database } from "bun:sqlite";
import type { DatabaseSecurityPolicy } from "./policy.js";

export interface DatabaseSchema {
  databaseType: "sqlite" | "postgres" | "mysql";
  tables: TableSchema[];
  relationships: EntityRelationship[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKeys: string[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  jsType: "string" | "number" | "boolean" | "object";
  nullable: boolean;
  defaultValue?: string | null;
  isPrimaryKey: boolean;
}

export interface EntityRelationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export class DatabaseIntrospector {
  introspectSqlite(dbPath: string, policy: DatabaseSecurityPolicy): DatabaseSchema {
    const db = new Database(dbPath, { readonly: true });

    try {
      // 1. Get user tables
      const tableRows = db
        .query<{ name: string }, []>(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        )
        .all();

      const tables: TableSchema[] = [];
      const relationships: EntityRelationship[] = [];

      for (const row of tableRows) {
        const tableName = row.name;

        // Policy filter
        if (policy.denyTables.some((d) => tableName.toLowerCase().includes(d.toLowerCase()))) {
          continue;
        }
        if (policy.allowTables && policy.allowTables.length > 0 && !policy.allowTables.includes(tableName)) {
          continue;
        }

        // 2. Get column information
        const colRows = db
          .query<
            {
              cid: number;
              name: string;
              type: string;
              notnull: number;
              dflt_value: string | null;
              pk: number;
            },
            [string]
          >(`PRAGMA table_info("${tableName}")`)
          .all(tableName);

        const columns: ColumnSchema[] = colRows.map((c) => ({
          name: c.name,
          type: c.type || "TEXT",
          jsType: this.mapSqliteTypeToJs(c.type || "TEXT"),
          nullable: c.notnull === 0,
          defaultValue: c.dflt_value,
          isPrimaryKey: c.pk > 0,
        }));

        const primaryKeys = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

        tables.push({
          name: tableName,
          columns,
          primaryKeys,
        });

        // 3. Get foreign keys
        const fkRows = db
          .query<
            {
              id: number;
              seq: number;
              table: string;
              from: string;
              to: string;
            },
            [string]
          >(`PRAGMA foreign_key_list("${tableName}")`)
          .all(tableName);

        for (const fk of fkRows) {
          relationships.push({
            sourceTable: tableName,
            sourceColumn: fk.from,
            targetTable: fk.table,
            targetColumn: fk.to,
          });
        }
      }

      return {
        databaseType: "sqlite",
        tables,
        relationships,
      };
    } finally {
      db.close();
    }
  }

  private mapSqliteTypeToJs(sqliteType: string): "string" | "number" | "boolean" | "object" {
    const t = sqliteType.toUpperCase();
    if (t.includes("INT") || t.includes("FLOAT") || t.includes("DOUBLE") || t.includes("REAL") || t.includes("NUM")) {
      return "number";
    }
    if (t.includes("BOOL")) {
      return "boolean";
    }
    if (t.includes("JSON") || t.includes("BLOB")) {
      return "object";
    }
    return "string";
  }
}
