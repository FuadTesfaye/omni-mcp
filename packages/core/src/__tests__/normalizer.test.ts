import { describe, it, expect } from "bun:test";
import { SchemaNormalizer } from "../normalizer.js";

describe("SchemaNormalizer", () => {
  const normalizer = new SchemaNormalizer();

  describe("normalizeName", () => {
    it("converts camelCase to snake_case", () => {
      expect(normalizer.normalizeName("createCustomer")).toBe("create_customer");
      expect(normalizer.normalizeName("getOrderById")).toBe("get_order_by_id");
    });

    it("handles special characters", () => {
      expect(normalizer.normalizeName("POST /customers")).toBe("post_customers");
      expect(normalizer.normalizeName("api.v2.users")).toBe("api_v2_users");
    });

    it("collapses multiple underscores", () => {
      expect(normalizer.normalizeName("get__users")).toBe("get_users");
    });

    it("removes leading/trailing underscores", () => {
      expect(normalizer.normalizeName("_get_users_")).toBe("get_users");
    });
  });

  describe("normalizeDescription", () => {
    it("generates descriptions from method+path", () => {
      const desc = normalizer.normalizeDescription("GET", "/users/{id}");
      expect(desc).toBe("Execute GET /users/{id}");
    });

    it("preserves good existing descriptions", () => {
      const desc = normalizer.normalizeDescription(
        "GET",
        "/users",
        "List all active users with pagination"
      );
      expect(desc).toBe("List all active users with pagination");
    });

    it("replaces short descriptions", () => {
      const desc = normalizer.normalizeDescription("GET", "/users", "Get");
      expect(desc).toBe("Execute GET /users");
    });
  });
});
