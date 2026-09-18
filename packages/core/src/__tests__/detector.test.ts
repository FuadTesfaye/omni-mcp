import { describe, it, expect } from "bun:test";
import { TargetDetector } from "../detector.js";

describe("TargetDetector", () => {
  const detector = new TargetDetector();

  it("detects OpenAPI URLs", async () => {
    const results = await detector.detect({
      raw: "https://api.example.com/openapi.json",
    });
    expect(results[0].type).toBe("openapi");
    expect(results[0].confidence).toBeGreaterThan(0.8);
  });

  it("detects database URIs", async () => {
    const results = await detector.detect({
      raw: "postgres://localhost/mydb",
    });
    expect(results[0].type).toBe("database-postgres");
  });

  it("detects MySQL URIs", async () => {
    const results = await detector.detect({
      raw: "mysql://localhost/mydb",
    });
    expect(results[0].type).toBe("database-mysql");
  });

  it("respects explicit type override", async () => {
    const results = await detector.detect({
      raw: "./something",
      type: "cli",
    });
    expect(results[0].type).toBe("cli");
    expect(results[0].confidence).toBe(1.0);
  });

  it("detects GraphQL URLs", async () => {
    const results = await detector.detect({
      raw: "https://api.example.com/graphql",
    });
    expect(results[0].type).toBe("graphql");
  });

  it("falls back to website for unknown URLs", async () => {
    const results = await detector.detect({
      raw: "https://example.com",
    });
    expect(results[0].type).toBe("website");
  });
});
