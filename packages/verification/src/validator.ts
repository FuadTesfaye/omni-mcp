import type { IntermediateToolDefinition, JsonSchema } from "@omni-mcp/types";

export interface SchemaValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ToolSchemaValidator {
  validate(tool: IntermediateToolDefinition): SchemaValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Tool name validation
    if (!/^[a-z0-9_]+$/.test(tool.name)) {
      errors.push(`Tool name '${tool.name}' is not clean snake_case.`);
    }

    // 2. InputSchema structure validation
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      errors.push("Missing inputSchema or inputSchema is not an object.");
    } else {
      if (tool.inputSchema.type !== "object") {
        errors.push(`inputSchema type must be 'object', got '${tool.inputSchema.type}'`);
      }

      if (tool.inputSchema.required && !Array.isArray(tool.inputSchema.required)) {
        errors.push("inputSchema.required must be an array of strings.");
      }

      if (tool.inputSchema.properties) {
        for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          if (!propSchema || typeof propSchema !== "object") {
            errors.push(`Property '${propName}' schema must be an object.`);
          } else {
            const schema = propSchema as JsonSchema;
            if (!schema.type && !schema.$ref && !schema.oneOf && !schema.anyOf) {
              warnings.push(`Property '${propName}' has no explicit type.`);
            }
          }
        }
      }
    }

    // 3. Description check
    if (!tool.description || tool.description.trim().length < 5) {
      warnings.push("Tool description is missing or excessively brief.");
    }

    // 4. Execution check
    if (!tool.execution || !tool.execution.type) {
      errors.push("Missing execution definition or execution type.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
