import type {
  IntermediateToolDefinition,
  HttpExecutionConfig,
  ExecutionContext,
  ExecutionResult,
} from "@omni-mcp/types";

/**
 * Execute an HTTP request based on an IntermediateToolDefinition.
 * Constructs the request safely from typed arguments.
 */
export async function executeHttpTool(
  tool: IntermediateToolDefinition,
  input: Record<string, unknown>,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const config = tool.execution.config as unknown as HttpExecutionConfig;
  const startTime = Date.now();

  try {
    // 1. Build URL with path parameters substituted
    let resolvedPath = config.pathTemplate;
    const queryParams = new URLSearchParams();
    const headers = new Headers({
      ...(context.headers || {}),
      ...(config.headers || {}),
    });

    // 2. Separate parameters by location
    for (const param of config.parameters) {
      const value = input[param.name];
      if (value === undefined) continue;

      switch (param.in) {
        case "path":
          resolvedPath = resolvedPath.replace(
            `{${param.name}}`,
            encodeURIComponent(String(value))
          );
          break;
        case "query":
          queryParams.append(param.name, String(value));
          break;
        case "header":
          headers.set(param.name, String(value));
          break;
      }
    }

    // 3. Inject credentials (never exposed to the model)
    if (context.credentials) {
      if (context.credentials.bearer) {
        headers.set("Authorization", `Bearer ${context.credentials.bearer}`);
      }
      if (context.credentials.apiKey && context.credentials.apiKeyHeader) {
        headers.set(
          context.credentials.apiKeyHeader,
          context.credentials.apiKey
        );
      }
    }

    // 4. Build request body for mutation methods
    let body: string | undefined;
    if (["POST", "PUT", "PATCH"].includes(config.method)) {
      headers.set(
        "Content-Type",
        config.requestBodyContentType || "application/json"
      );

      if (input.requestBody !== undefined) {
        body = JSON.stringify(input.requestBody);
      } else {
        const paramNames = new Set(config.parameters.map((p) => p.name));
        const bodyObj: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(input)) {
          if (!paramNames.has(key)) {
            const actualKey = key.startsWith("body_") ? key.slice(5) : key;
            bodyObj[actualKey] = val;
          }
        }
        if (Object.keys(bodyObj).length > 0) {
          body = JSON.stringify(bodyObj);
        }
      }
    }

    // 5. Construct final URL
    const queryString = queryParams.toString();
    const baseUrl = config.baseUrl.replace(/\/$/, "");
    const pathPart = resolvedPath.replace(/^\//, "");
    const finalUrl = `${baseUrl}/${pathPart}${
      queryString ? `?${queryString}` : ""
    }`;

    // 6. Execute with timeout
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      context.timeoutMs || 30000
    );

    try {
      const response = await fetch(finalUrl, {
        method: config.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: `${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`,
            category:
              response.status === 401 || response.status === 403
                ? "authentication"
                : "upstream",
            retryable: response.status >= 500,
            details: {
              status: response.status,
              body: responseText.slice(0, 1000),
            },
          },
          metadata: {
            durationMs: Date.now() - startTime,
            source: "openapi",
            requestId: context.requestId,
          },
        };
      }

      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      return {
        success: true,
        data,
        metadata: {
          durationMs: Date.now() - startTime,
          source: "openapi",
          requestId: context.requestId,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    const err = error as Error & { name: string };
    return {
      success: false,
      error: {
        code: err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
        message: err.message,
        category: err.name === "AbortError" ? "timeout" : "upstream",
        retryable: true,
      },
      metadata: {
        durationMs: Date.now() - startTime,
        source: "openapi",
        requestId: context.requestId,
      },
    };
  }
}
