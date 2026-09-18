import type {
  IntermediateToolDefinition,
  JsonSchema,
  RiskAssessment,
} from "@omni-mcp/types";
import type { DatabaseSchema, TableSchema, EntityRelationship } from "./introspector.js";
import type { DatabaseSecurityPolicy } from "./policy.js";
import { randomUUID } from "crypto";

export class DatabaseToolSynthesizer {
  synthesize(
    schema: DatabaseSchema,
    sourceIdentifier: string,
    policy: DatabaseSecurityPolicy
  ): IntermediateToolDefinition[] {
    const tools: IntermediateToolDefinition[] = [];

    for (const table of schema.tables) {
      // 1. get_<table_name> (by PK)
      if (table.primaryKeys.length > 0) {
        tools.push(this.synthesizeGetTool(table, sourceIdentifier));
      }

      // 2. search_<table_name> (with pagination & column filters)
      tools.push(this.synthesizeSearchTool(table, sourceIdentifier, policy));

      // 3. insert_<table_name> (only if writes permitted)
      if (!policy.readOnly) {
        tools.push(this.synthesizeInsertTool(table, sourceIdentifier, policy));
      }
    }

    // 4. Foreign key relationship tools: get_<target>_<source>
    for (const rel of schema.relationships) {
      tools.push(this.synthesizeRelationshipTool(rel, sourceIdentifier));
    }

    return tools;
  }

  private synthesizeGetTool(table: TableSchema, source: string): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const pk of table.primaryKeys) {
      const col = table.columns.find((c) => c.name === pk);
      properties[pk] = {
        type: col?.jsType || "string",
        description: `Primary key: ${pk} for table ${table.name}`,
      };
      required.push(pk);
    }

    const toolName = `get_${table.name}`.toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: `Get ${table.name}`,
      description: `Retrieve a single record from ${table.name} by primary key (${table.primaryKeys.join(", ")})`,
      source: {
        type: "database",
        identifier: source,
        originalName: table.name,
      },
      inputSchema: {
        type: "object",
        properties,
        required,
      },
      execution: {
        type: "sql",
        config: {
          operation: "get",
          table: table.name,
          primaryKeys: table.primaryKeys,
        },
      },
      risk: {
        level: "low",
        actions: ["read", "select"],
      },
      metadata: {
        tags: ["database", table.name],
        confidence: 0.98,
        generated: true,
        group: table.name,
      },
    };
  }

  private synthesizeSearchTool(
    table: TableSchema,
    source: string,
    policy: DatabaseSecurityPolicy
  ): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {
      limit: {
        type: "number",
        description: `Maximum number of records to return (default: 20, max: ${policy.maxLimit})`,
        default: 20,
      },
      offset: {
        type: "number",
        description: "Number of records to skip for pagination (default: 0)",
        default: 0,
      },
    };

    // Add searchable column properties
    for (const col of table.columns.slice(0, 8)) {
      properties[col.name] = {
        type: col.jsType,
        description: `Filter by ${col.name} (${col.type})`,
      };
    }

    const toolName = `search_${table.name}`.toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: `Search ${table.name}`,
      description: `Search and filter records in ${table.name} with pagination`,
      source: {
        type: "database",
        identifier: source,
        originalName: table.name,
      },
      inputSchema: {
        type: "object",
        properties,
      },
      execution: {
        type: "sql",
        config: {
          operation: "search",
          table: table.name,
          maxLimit: policy.maxLimit,
        },
      },
      risk: {
        level: "low",
        actions: ["read", "select"],
      },
      metadata: {
        tags: ["database", table.name],
        confidence: 0.98,
        generated: true,
        group: table.name,
      },
    };
  }

  private synthesizeRelationshipTool(
    rel: EntityRelationship,
    source: string
  ): IntermediateToolDefinition {
    const toolName = `get_${rel.targetTable}_${rel.sourceTable}`.toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: `Get ${rel.sourceTable} for ${rel.targetTable}`,
      description: `Retrieve all ${rel.sourceTable} associated with ${rel.targetTable} via foreign key ${rel.sourceColumn}`,
      source: {
        type: "database",
        identifier: source,
        originalName: `${rel.targetTable}->${rel.sourceTable}`,
      },
      inputSchema: {
        type: "object",
        properties: {
          [rel.targetColumn]: {
            type: "string",
            description: `Target key ${rel.targetColumn} in table ${rel.targetTable}`,
          },
        },
        required: [rel.targetColumn],
      },
      execution: {
        type: "sql",
        config: {
          operation: "relationship",
          sourceTable: rel.sourceTable,
          sourceColumn: rel.sourceColumn,
          targetTable: rel.targetTable,
          targetColumn: rel.targetColumn,
        },
      },
      risk: {
        level: "low",
        actions: ["read", "select", "join"],
      },
      metadata: {
        tags: ["database", rel.targetTable, rel.sourceTable],
        confidence: 0.95,
        generated: true,
        group: rel.targetTable,
      },
    };
  }

  private synthesizeInsertTool(
    table: TableSchema,
    source: string,
    policy: DatabaseSecurityPolicy
  ): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const col of table.columns) {
      if (col.isPrimaryKey && col.defaultValue) continue; // Skip auto-increment PKs

      properties[col.name] = {
        type: col.jsType,
        description: `Value for column ${col.name}`,
      };
      if (!col.nullable && !col.defaultValue) {
        required.push(col.name);
      }
    }

    const toolName = `insert_${table.name}`.toLowerCase();

    return {
      id: randomUUID(),
      name: toolName,
      title: `Insert into ${table.name}`,
      description: `Insert a new record into table ${table.name}`,
      source: {
        type: "database",
        identifier: source,
        originalName: table.name,
      },
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      execution: {
        type: "sql",
        config: {
          operation: "insert",
          table: table.name,
        },
      },
      risk: {
        level: "medium",
        actions: ["write", "insert"],
        requiresApproval: policy.requireApprovalForWrites,
      },
      metadata: {
        tags: ["database", table.name, "mutation"],
        confidence: 0.9,
        generated: true,
        group: table.name,
      },
    };
  }
}
