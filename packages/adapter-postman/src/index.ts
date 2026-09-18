import type {
  OmniAdapter,
  AdapterTarget,
  DetectionResult,
  InspectionResult,
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
  HttpExecutionConfig,
} from "@omni-mcp/types";
import { PostmanParser } from "./parser.js";
import { PostmanConverter } from "./converter.js";

export class PostmanAdapter implements OmniAdapter {
  name = "postman";
  description = "Adapter for Postman Collection v2.0 and v2.1 exports";
  sourceTypes = ["postman"];

  private parser = new PostmanParser();
  private converter = new PostmanConverter();

  async detect(input: AdapterTarget): Promise<DetectionResult> {
    const raw = input.raw.trim();

    if (input.type === "postman") {
      return { detected: true, confidence: 1.0, type: "postman" };
    }

    // Check if path or url points to a postman collection JSON
    if (raw.endsWith(".json")) {
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
          content.includes('"schema"') &&
          content.includes("schema.getpostman.com/json/collection")
        ) {
          return { detected: true, confidence: 0.98, type: "postman" };
        }

        // Alternative heuristic
        if (content.includes('"info"') && content.includes('"item"') && content.includes('"request"')) {
          return { detected: true, confidence: 0.88, type: "postman" };
        }
      } catch {
        // Not readable
      }
    }

    return { detected: false, confidence: 0 };
  }

  async inspect(input: AdapterTarget): Promise<InspectionResult> {
    let content: string;
    if (input.raw.startsWith("http://") || input.raw.startsWith("https://")) {
      const res = await fetch(input.raw);
      content = await res.text();
    } else {
      const fs = await import("fs/promises");
      content = await fs.readFile(input.raw, "utf-8");
    }

    const { info, requests } = this.parser.parse(content);

    return {
      source: input.raw,
      sourceType: "postman",
      capabilities: requests.map((r) => ({
        name: r.name,
        description: r.description,
        rawSchema: r,
        confidence: "confirmed" as const,
        tags: [r.group],
      })),
      metadata: {
        collectionInfo: info,
        requests,
        totalRequests: requests.length,
      },
    };
  }

  async synthesize(inspection: InspectionResult): Promise<IntermediateToolDefinition[]> {
    const requests = inspection.metadata.requests as any[];
    return this.converter.convert(requests, inspection.source);
  }

  async execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const config = tool.execution.config as unknown as HttpExecutionConfig;
    const startTime = Date.now();

    try {
      let resolvedPath = config.pathTemplate;
      const queryParams = new URLSearchParams();
      const headers = new Headers({
        ...(config.headers || {}),
        ...(context.headers || {}),
      });

      for (const param of config.parameters) {
        const val = input[param.name];
        if (val === undefined) continue;

        if (param.in === "path") {
          resolvedPath = resolvedPath.replace(`:${param.name}`, encodeURIComponent(String(val)));
          resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(String(val)));
        } else if (param.in === "query") {
          queryParams.append(param.name, String(val));
        }
      }

      // Add auth credentials if present
      if (context.credentials) {
        if (context.credentials.bearer) {
          headers.set("Authorization", `Bearer ${context.credentials.bearer}`);
        }
      }

      let body: string | undefined;
      if (["POST", "PUT", "PATCH"].includes(config.method)) {
        headers.set("Content-Type", config.requestBodyContentType || "application/json");

        const bodyObj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input)) {
          if (!config.parameters.some((p) => p.name === k)) {
            const cleanKey = k.startsWith("body_") ? k.slice(5) : k;
            bodyObj[cleanKey] = v;
          }
        }
        if (Object.keys(bodyObj).length > 0) {
          body = JSON.stringify(bodyObj);
        }
      }

      const queryString = queryParams.toString();
      const finalUrl = `${config.baseUrl.replace(/\/$/, "")}/${resolvedPath.replace(/^\//, "")}${
        queryString ? `?${queryString}` : ""
      }`;

      const res = await fetch(finalUrl, {
        method: config.method,
        headers,
        body,
      });

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      return {
        success: res.ok,
        data,
        metadata: {
          durationMs: Date.now() - startTime,
          source: "postman",
          requestId: context.requestId,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "HTTP_POSTMAN_ERROR",
          message: err.message,
          category: "upstream",
          retryable: true,
        },
        metadata: {
          durationMs: Date.now() - startTime,
          source: "postman",
          requestId: context.requestId,
        },
      };
    }
  }
}

export { PostmanParser } from "./parser.js";
export { PostmanConverter } from "./converter.js";
