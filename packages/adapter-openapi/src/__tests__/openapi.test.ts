import { describe, it, expect } from "bun:test";
import { convertToIntermediateTools } from "../converter.js";
import { OpenApiAdapter } from "../index.js";
import type { ParsedSpec } from "../parser.js";

describe("OpenApiAdapter", () => {
  const sampleSpec: ParsedSpec = {
    title: "Test API",
    version: "1.0.0",
    description: "A test API spec",
    baseUrl: "https://api.example.com",
    paths: {
      "/users/{id}": {
        path: "/users/{id}",
        operations: [
          {
            operationId: "getUserById",
            method: "GET",
            path: "/users/{id}",
            summary: "Get a user by ID",
            tags: ["users"],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {},
            security: [],
            deprecated: false,
          },
          {
            operationId: "deleteUser",
            method: "DELETE",
            path: "/users/{id}",
            summary: "Delete a user",
            tags: ["users"],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {},
            security: [{ apiKey: [] }],
            deprecated: false,
          },
        ],
      },
      "/users": {
        path: "/users",
        operations: [
          {
            operationId: "createUser",
            method: "POST",
            path: "/users",
            summary: "Create a new user",
            tags: ["users"],
            parameters: [],
            requestBody: {
              required: true,
              contentType: "application/json",
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
                required: ["name", "email"],
              },
            },
            responses: {},
            security: [],
            deprecated: false,
          },
        ],
      },
    },
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        name: "X-API-Key",
        in: "header",
      },
    },
  };

  it("converts operations into intermediate tool definitions", () => {
    const tools = convertToIntermediateTools(sampleSpec, "memory://test-spec");
    expect(tools.length).toBe(3);

    const getTool = tools.find((t) => t.name === "getUserById");
    expect(getTool).toBeDefined();
    expect(getTool?.title).toBe("Get a user by ID");
    expect(getTool?.execution.type).toBe("http");
    expect(getTool?.inputSchema.properties?.id).toBeDefined();

    const deleteTool = tools.find((t) => t.name === "deleteUser");
    expect(deleteTool).toBeDefined();
    expect(deleteTool?.auth?.required).toBe(true);

    const createTool = tools.find((t) => t.name === "createUser");
    expect(createTool).toBeDefined();
    expect(createTool?.inputSchema.properties?.name).toBeDefined();
    expect(createTool?.inputSchema.properties?.email).toBeDefined();
    expect(createTool?.inputSchema.required).toContain("name");
    expect(createTool?.inputSchema.required).toContain("email");
  });

  it("detects OpenAPI URLs and JSON extensions", async () => {
    const adapter = new OpenApiAdapter();
    const result = await adapter.detect({ raw: "https://example.com/openapi.json" });
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
