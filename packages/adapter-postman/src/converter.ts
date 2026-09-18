import type {
  IntermediateToolDefinition,
  HttpExecutionConfig,
  JsonSchema,
  RiskAssessment,
} from "@omni-mcp/types";
import type { FlattenedPostmanRequest, PostmanAuth } from "./parser.js";
import { randomUUID } from "crypto";

export class PostmanConverter {
  convert(
    requests: FlattenedPostmanRequest[],
    sourceIdentifier: string
  ): IntermediateToolDefinition[] {
    return requests.map((req) => this.convertRequest(req, sourceIdentifier));
  }

  private convertRequest(
    req: FlattenedPostmanRequest,
    source: string
  ): IntermediateToolDefinition {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    // Path variables
    for (const pv of req.pathVariables) {
      properties[pv.key] = {
        type: "string",
        description: pv.description || `Path variable: ${pv.key}`,
      };
      required.push(pv.key);
    }

    // Query parameters
    for (const q of req.queryParams) {
      properties[q.key] = {
        type: "string",
        description: q.description || `Query parameter: ${q.key}`,
        default: q.defaultValue,
      };
    }

    // Body schema fields
    if (req.bodySchema && req.bodySchema.properties) {
      for (const [k, v] of Object.entries(req.bodySchema.properties as Record<string, any>)) {
        const propKey = properties[k] ? `body_${k}` : k;
        properties[propKey] = {
          type: v.type || "string",
          description: `Body parameter: ${k}`,
        };
      }
      if (Array.isArray(req.bodySchema.required)) {
        for (const reqField of req.bodySchema.required) {
          required.push(properties[reqField] ? reqField : `body_${reqField}`);
        }
      }
    }

    const toolName = req.id || req.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

    const executionConfig: HttpExecutionConfig = {
      method: req.method,
      pathTemplate: req.path,
      baseUrl: this.inferBaseUrl(req.rawUrl),
      parameters: [
        ...req.pathVariables.map((pv) => ({
          name: pv.key,
          in: "path" as const,
          required: true,
          schema: { type: "string" },
        })),
        ...req.queryParams.map((q) => ({
          name: q.key,
          in: "query" as const,
          required: false,
          schema: { type: "string" },
        })),
      ],
      requestBodyContentType: req.bodySchema ? "application/json" : undefined,
      headers: req.headers,
    };

    const risk: RiskAssessment = {
      level: req.method === "DELETE" ? "critical" : ["POST", "PUT", "PATCH"].includes(req.method) ? "medium" : "low",
      actions: [req.method.toLowerCase(), "http"],
      requiresApproval: req.method === "DELETE",
    };

    return {
      id: randomUUID(),
      name: toolName,
      title: req.name,
      description: req.description || `${req.method} ${req.rawUrl}`,
      source: {
        type: "postman",
        identifier: source,
        originalName: req.name,
      },
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required: [...new Set(required)] } : {}),
      },
      execution: {
        type: "http",
        config: executionConfig as unknown as Record<string, unknown>,
      },
      auth: this.convertAuth(req.auth),
      risk,
      metadata: {
        tags: [req.group],
        confidence: 0.9,
        generated: true,
        group: req.group,
      },
    };
  }

  private inferBaseUrl(rawUrl: string): string {
    try {
      // Replace postman {{variables}} with dummy to extract base url
      const normalized = rawUrl.replace(/\{\{[^}]+\}\}/g, "api.example.com");
      const u = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "https://api.example.com";
    }
  }

  private convertAuth(auth?: PostmanAuth): IntermediateToolDefinition["auth"] {
    if (!auth || auth.type === "noauth") return undefined;

    return {
      type: auth.type === "bearer" ? "bearer" : auth.type === "basic" ? "basic" : "apiKey",
      required: true,
    };
  }
}
