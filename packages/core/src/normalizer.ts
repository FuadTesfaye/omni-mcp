import type { IntermediateToolDefinition } from "@omni-mcp/types";

/**
 * Normalizes tool names, descriptions, and schemas
 * into consistent, AI-friendly formats.
 */
export class SchemaNormalizer {
  /**
   * Normalize a tool name to snake_case
   */
  normalizeName(name: string): string {
    return name
      // camelCase to snake_case
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      // Remove special characters
      .replace(/[^a-zA-Z0-9_]/g, "_")
      // Collapse multiple underscores
      .replace(/_+/g, "_")
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, "")
      .toLowerCase();
  }

  /**
   * Normalize a raw description into an AI-friendly format
   */
  normalizeDescription(
    method?: string,
    path?: string,
    rawDescription?: string
  ): string {
    if (rawDescription && rawDescription.length > 10) {
      return rawDescription;
    }

    if (method && path) {
      return `Execute ${method.toUpperCase()} ${path}`;
    }

    return "No description available";
  }

  /**
   * Assign risk levels based on HTTP method and operation semantics
   */
  classifyRisk(
    tool: IntermediateToolDefinition
  ): IntermediateToolDefinition["risk"] {
    const exec = tool.execution.config as Record<string, unknown>;
    const method = (exec.method as string)?.toUpperCase() || "";
    const name = tool.name.toLowerCase();

    if (
      method === "DELETE" ||
      name.includes("delete") ||
      name.includes("remove") ||
      name.includes("destroy")
    ) {
      return {
        level: "critical",
        actions: ["destructive", method.toLowerCase()],
        requiresApproval: true,
      };
    }

    if (
      ["POST", "PUT", "PATCH"].includes(method) ||
      name.includes("create") ||
      name.includes("update")
    ) {
      return {
        level: "medium",
        actions: ["mutation", method.toLowerCase()],
      };
    }

    return {
      level: "low",
      actions: ["read", method.toLowerCase()],
    };
  }
}
