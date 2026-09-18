import SwaggerParser from "@apidevtools/swagger-parser";

export interface ParsedSpec {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  paths: Record<string, PathItem>;
  securitySchemes: Record<string, SecurityScheme>;
}

export interface PathItem {
  path: string;
  operations: ParsedOperation[];
}

export interface ParsedOperation {
  operationId?: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: Record<string, unknown>;
  security: unknown[];
  deprecated: boolean;
}

export interface ParsedParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
  schema: Record<string, unknown>;
}

export interface ParsedRequestBody {
  required: boolean;
  contentType: string;
  schema: Record<string, unknown>;
  description?: string;
}

export interface SecurityScheme {
  type: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
}

/**
 * Parse and dereference an OpenAPI/Swagger specification.
 */
export async function parseOpenApiSpec(
  source: string
): Promise<ParsedSpec> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (await SwaggerParser.dereference(source)) as any;

  const baseUrl =
    api.servers?.[0]?.url ||
    (api.host
      ? `${api.schemes?.[0] || "https"}://${api.host}${api.basePath || ""}`
      : "http://localhost");

  const paths: Record<string, PathItem> = {};

  for (const [pathKey, pathItem] of Object.entries<any>(api.paths || {})) {
    const methods = ["get", "post", "put", "delete", "patch", "head", "options"];
    const operations: ParsedOperation[] = [];

    for (const method of methods) {
      const op = pathItem[method];
      if (!op) continue;

      const parameters: ParsedParameter[] = [
        ...(pathItem.parameters || []),
        ...(op.parameters || []),
      ].map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required || p.in === "path",
        description: p.description,
        schema: p.schema || { type: "string" },
      }));

      let requestBody: ParsedRequestBody | undefined;
      if (op.requestBody?.content) {
        const contentType =
          Object.keys(op.requestBody.content)[0] || "application/json";
        const mediaType = op.requestBody.content[contentType];
        requestBody = {
          required: op.requestBody.required || false,
          contentType,
          schema: mediaType?.schema || {},
          description: op.requestBody.description,
        };
      }

      operations.push({
        operationId: op.operationId,
        method: method.toUpperCase(),
        path: pathKey,
        summary: op.summary,
        description: op.description,
        tags: op.tags || [],
        parameters,
        requestBody,
        responses: op.responses || {},
        security: op.security || api.security || [],
        deprecated: op.deprecated || false,
      });
    }

    if (operations.length > 0) {
      paths[pathKey] = { path: pathKey, operations };
    }
  }

  const securitySchemes: Record<string, SecurityScheme> = {};
  const schemes =
    api.components?.securityDefinitions ||
    api.components?.securitySchemes ||
    {};
  for (const [name, scheme] of Object.entries<any>(schemes)) {
    securitySchemes[name] = {
      type: scheme.type,
      name: scheme.name,
      in: scheme.in,
      scheme: scheme.scheme,
      bearerFormat: scheme.bearerFormat,
    };
  }

  return {
    title: api.info?.title || "Unknown API",
    version: api.info?.version || "0.0.0",
    description: api.info?.description,
    baseUrl,
    paths,
    securitySchemes,
  };
}
