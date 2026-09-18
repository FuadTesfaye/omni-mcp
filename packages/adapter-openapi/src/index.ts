import type {
  OmniAdapter,
  AdapterTarget,
  DetectionResult,
  InspectionResult,
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
} from "@omni-mcp/types";
import { parseOpenApiSpec } from "./parser.js";
import { convertToIntermediateTools } from "./converter.js";
import { executeHttpTool } from "./executor.js";

export class OpenApiAdapter implements OmniAdapter {
  name = "openapi";
  description = "Adapter for OpenAPI/Swagger specifications";
  sourceTypes = ["openapi", "swagger"];

  async detect(input: AdapterTarget): Promise<DetectionResult> {
    const raw = input.raw;

    // URL ending in common OpenAPI patterns
    if (/\.(json|ya?ml)$/i.test(raw) && /openapi|swagger|api/i.test(raw)) {
      return { detected: true, confidence: 0.9, type: "openapi" };
    }

    // Try to fetch/read and check for OpenAPI markers
    try {
      let content: string;
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const res = await fetch(raw);
        content = await res.text();
      } else {
        const fs = await import("fs/promises");
        content = await fs.readFile(raw, "utf-8");
      }

      if (
        content.includes('"openapi"') ||
        content.includes("openapi:") ||
        content.includes('"swagger"') ||
        content.includes("swagger:")
      ) {
        return { detected: true, confidence: 0.95, type: "openapi" };
      }
    } catch {
      // Not accessible
    }

    return { detected: false, confidence: 0 };
  }

  async inspect(input: AdapterTarget): Promise<InspectionResult> {
    const spec = await parseOpenApiSpec(input.raw);

    const capabilities = Object.values(spec.paths).flatMap((pathItem) =>
      pathItem.operations.map((op) => ({
        name: op.operationId || `${op.method} ${op.path}`,
        description: op.summary || op.description,
        rawSchema: op,
        confidence: "confirmed" as const,
        tags: op.tags,
      }))
    );

    return {
      source: input.raw,
      sourceType: "openapi",
      capabilities,
      auth:
        Object.keys(spec.securitySchemes).length > 0
          ? {
              type: Object.values(spec.securitySchemes)[0]?.type || "unknown",
              schemes: Object.keys(spec.securitySchemes),
            }
          : undefined,
      metadata: {
        title: spec.title,
        version: spec.version,
        description: spec.description,
        baseUrl: spec.baseUrl,
        endpointCount: capabilities.length,
      },
    };
  }

  async synthesize(
    inspection: InspectionResult
  ): Promise<IntermediateToolDefinition[]> {
    const spec = await parseOpenApiSpec(inspection.source);
    return convertToIntermediateTools(spec, inspection.source);
  }

  async execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    return executeHttpTool(tool, input, context);
  }
}

export { parseOpenApiSpec } from "./parser.js";
export { convertToIntermediateTools } from "./converter.js";
export { executeHttpTool } from "./executor.js";
