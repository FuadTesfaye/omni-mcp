export interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string }>;
  auth?: PostmanAuth;
}

export interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: {
    method: string;
    header?: Array<{ key: string; value: string; description?: string }>;
    body?: {
      mode?: "raw" | "urlencoded" | "formdata";
      raw?: string;
      options?: { raw?: { language?: string } };
    };
    url: {
      raw?: string;
      protocol?: string;
      host?: string[] | string;
      path?: string[] | string;
      query?: Array<{ key: string; value: string; description?: string }>;
      variable?: Array<{ key: string; value: string; description?: string }>;
    } | string;
    description?: string;
    auth?: PostmanAuth;
  };
}

export interface PostmanAuth {
  type: "bearer" | "basic" | "apikey" | "noauth" | string;
  bearer?: Array<{ key: string; value: string }>;
  basic?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string }>;
}

export interface FlattenedPostmanRequest {
  id: string;
  name: string;
  group: string;
  description: string;
  method: string;
  rawUrl: string;
  path: string;
  queryParams: Array<{ key: string; description?: string; defaultValue?: string }>;
  pathVariables: Array<{ key: string; description?: string }>;
  headers: Record<string, string>;
  bodySchema?: Record<string, unknown>;
  auth?: PostmanAuth;
}

export class PostmanParser {
  parse(collectionJson: string | Record<string, unknown>): {
    info: PostmanCollection["info"];
    requests: FlattenedPostmanRequest[];
  } {
    const data = (typeof collectionJson === "string" ? JSON.parse(collectionJson) : collectionJson) as PostmanCollection;

    const requests: FlattenedPostmanRequest[] = [];
    this.flattenItems(data.item || [], data.info?.name || "root", requests, data.auth);

    return {
      info: data.info || { name: "Postman Collection", schema: "" },
      requests,
    };
  }

  private flattenItems(
    items: PostmanItem[],
    currentGroup: string,
    result: FlattenedPostmanRequest[],
    parentAuth?: PostmanAuth
  ): void {
    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        // Nested folder
        const nextGroup = currentGroup ? `${currentGroup}/${item.name}` : item.name;
        this.flattenItems(item.item, nextGroup, result, item.request?.auth || parentAuth);
      } else if (item.request) {
        // Concrete request
        const req = item.request;
        const rawUrl = typeof req.url === "string" ? req.url : req.url?.raw || "";
        const method = (req.method || "GET").toUpperCase();

        const queryParams: Array<{ key: string; description?: string; defaultValue?: string }> = [];
        const pathVariables: Array<{ key: string; description?: string }> = [];

        if (typeof req.url === "object" && req.url !== null) {
          if (Array.isArray(req.url.query)) {
            for (const q of req.url.query) {
              if (q.key) {
                queryParams.push({
                  key: q.key,
                  description: q.description,
                  defaultValue: q.value,
                });
              }
            }
          }

          if (Array.isArray(req.url.variable)) {
            for (const v of req.url.variable) {
              if (v.key) {
                pathVariables.push({
                  key: v.key,
                  description: v.description,
                });
              }
            }
          }
        }

        // Headers
        const headers: Record<string, string> = {};
        if (Array.isArray(req.header)) {
          for (const h of req.header) {
            if (h.key) headers[h.key] = h.value || "";
          }
        }

        // Try extracting JSON schema from raw body
        let bodySchema: Record<string, unknown> | undefined;
        if (req.body?.mode === "raw" && req.body.raw) {
          try {
            const parsedBody = JSON.parse(req.body.raw);
            if (typeof parsedBody === "object" && parsedBody !== null) {
              bodySchema = this.inferJsonSchema(parsedBody);
            }
          } catch {
            // Raw text body
          }
        }

        result.push({
          id: item.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
          name: item.name,
          group: currentGroup,
          description: req.description || item.description || `${method} ${rawUrl}`,
          method,
          rawUrl,
          path: this.extractPath(rawUrl),
          queryParams,
          pathVariables,
          headers,
          bodySchema,
          auth: req.auth || parentAuth,
        });
      }
    }
  }

  private extractPath(rawUrl: string): string {
    try {
      const url = new URL(rawUrl.replace(/\{\{[^}]+\}\}/g, "http://placeholder.local"));
      return url.pathname;
    } catch {
      return rawUrl.split("?")[0] || "/";
    }
  }

  private inferJsonSchema(obj: Record<string, unknown>): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [k, v] of Object.entries(obj)) {
      const type = Array.isArray(v) ? "array" : typeof v;
      properties[k] = { type };
      required.push(k);
    }

    return {
      type: "object",
      properties,
      required,
    };
  }
}
