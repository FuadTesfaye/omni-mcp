import { describe, it, expect } from "bun:test";
import { VerificationEngine } from "../engine.js";
import type { IntermediateToolDefinition } from "@omni-mcp/types";

describe("VerificationEngine", () => {
  const engine = new VerificationEngine();

  const validTool: IntermediateToolDefinition = {
    id: "tool-1",
    name: "get_user",
    title: "Get User",
    description: "Retrieve a user profile by ID",
    source: { type: "openapi", identifier: "test" },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "User ID" },
      },
      required: ["id"],
    },
    execution: {
      type: "http",
      config: { method: "GET", pathTemplate: "/users/{id}", baseUrl: "https://api.test.com" },
    },
    risk: { level: "low", actions: ["read"] },
    metadata: { tags: ["users"], confidence: 0.95, generated: true },
  };

  it("verifies clean, valid tool definitions with high confidence", () => {
    const report = engine.verifyTool(validTool);
    expect(report.verified).toBe(true);
    expect(report.confidence).toBeGreaterThanOrEqual(0.9);
    expect(report.checks.every((c) => c.status !== "fail")).toBe(true);
  });

  it("flags invalid tool names and broken input schemas", () => {
    const invalidTool: IntermediateToolDefinition = {
      ...validTool,
      name: "INVALID-NAME!!",
      inputSchema: { type: "string" as any }, // Invalid: must be object
    };

    const report = engine.verifyTool(invalidTool);
    expect(report.verified).toBe(false);
    expect(report.confidence).toBeLessThan(0.8);
    expect(report.checks.some((c) => c.status === "fail")).toBe(true);
  });

  it("computes verification summaries for tool suites", () => {
    const summary = engine.verifyAll([validTool]);
    expect(summary.totalTools).toBe(1);
    expect(summary.verifiedCount).toBe(1);
    expect(summary.failureCount).toBe(0);
  });
});
