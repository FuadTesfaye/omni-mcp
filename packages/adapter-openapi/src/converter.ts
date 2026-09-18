import type {
  IntermediateToolDefinition,
  HttpExecutionConfig,
  JsonSchema,
} from "@omni-mcp/types";
import type { ParsedSpec, ParsedOperation } from "./parser.js";
import { randomUUID } from "crypto";

/**
 * Convert parsed OpenAPI operations into IntermediateToolDefinitions.
 */
export function convertToIntermediateTools(
  spec: ParsedSpec,
  source: string
): IntermediateToolDefinition[] {
  const tools: IntermediateToolDefinition[] = [];

  for (const [, pathItem] of Object.entries(spec.paths)) {
    for (const operation of pathItem.operations) {
      if (operation.deprecated) continue;

      const tool = convertOperation(operation, spec, source);
      tools.push(tool);
    }
  }

  return tools;
}

function convertOperation(
  op: ParsedOperation,
  spec: ParsedSpec,
  source: string
): IntermediateToolDefinition {
  const toolName = generateToolName(op);
  const inputSchema = buildInputSchema(op);
  const executionConfig = buildExecutionConfig(op, spec);

  // Determine group from tags
  const group = op.tags[0] || inferGroup(op.path);

  return {
    id: randomUUID(),
    name: toolName,
    title: op.summary || toolName,
    description: op.description || op.summary || `${op.method} ${op.path}`,
    source: {
      type: "openapi",
      identifier: source,
      originalName: op.operationId,
    },
    inputSchema,
    execution: {
      type: "http",
      config: executionConfig as unknown as Record<string, unknown>,
    },
    auth:
      Object.keys(spec.securitySchemes).length > 0
        ? {
            type: detectAuthType(spec.securitySchemes),
            required: op.security.length > 0,
          }
        : undefined,
    risk: {
      level: "low", // Will be recalculated by normalizer
      actions: [op.method.toLowerCase()],
    },
    permissions: {
      scopes: extractScopes(op.security),
    },
    metadata: {
      tags: op.tags,
      confidence: 0.95,
      generated: true,
      group,
    },
  };
}

function generateToolName(op: ParsedOperation): string {
  if (op.operationId) {
    return op.operationId;
  }

  // Generate from method + path: GET /users/{id} -> get_users_by_id
  const pathParts = op.path
    .split("/")
    .filter(Boolean)
    .map((p) => (p.startsWith("{") ? `by_${p.slice(1, -1)}` : p));

  return `${op.method.toLowerCase()}_${pathParts.join("_")}`;
}

function buildInputSchema(op: ParsedOperation): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  // Add parameters (path, query, header)
  for (const param of op.parameters) {
    properties[param.name] = {
      ...param.schema,
      description: param.description || `${param.in} parameter: ${param.name}`,
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  // Add request body properties
  if (op.requestBody) {
    const bodySchema = op.requestBody.schema as Record<string, any>;

    if (bodySchema.type === "object" && bodySchema.properties) {
      for (const [key, propSchema] of Object.entries<any>(bodySchema.properties)) {
        const propKey = properties[key] ? `body_${key}` : key;
        properties[propKey] = propSchema;
      }
      if (bodySchema.required) {
        for (const req of bodySchema.required) {
          required.push(properties[req] ? req : req);
        }
      }
    } else {
      properties["requestBody"] = bodySchema as JsonSchema;
      if (op.requestBody.required) {
        required.push("requestBody");
      }
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required: [...new Set(required)] } : {}),
  };
}

function buildExecutionConfig(
  op: ParsedOperation,
  spec: ParsedSpec
): HttpExecutionConfig {
  return {
    method: op.method,
    pathTemplate: op.path,
    baseUrl: spec.baseUrl,
    parameters: op.parameters.map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      schema: p.schema as JsonSchema,
    })),
    requestBodyContentType: op.requestBody?.contentType,
  };
}

function detectAuthType(
  schemes: Record<string, any>
): "apiKey" | "oauth2" | "bearer" | "basic" | "custom" {
  const types = Object.values(schemes).map((s) => s.type);
  if (types.includes("oauth2")) return "oauth2";
  if (types.includes("http")) {
    const httpScheme = Object.values(schemes).find(
      (s: any) => s.type === "http"
    ) as any;
    if (httpScheme?.scheme === "bearer") return "bearer";
    if (httpScheme?.scheme === "basic") return "basic";
  }
  if (types.includes("apiKey")) return "apiKey";
  return "custom";
}

function extractScopes(security: unknown[]): string[] {
  const scopes: string[] = [];
  for (const req of security) {
    for (const scopeList of Object.values(req as Record<string, unknown>)) {
      if (Array.isArray(scopeList)) {
        scopes.push(...(scopeList as string[]));
      }
    }
  }
  return [...new Set(scopes)];
}

function inferGroup(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[0] || "default";
}
