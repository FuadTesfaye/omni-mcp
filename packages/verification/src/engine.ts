import type { IntermediateToolDefinition } from "@omni-mcp/types";
import { ToolSchemaValidator } from "./validator.js";

export interface ToolVerificationReport {
  toolName: string;
  verified: boolean;
  confidence: number;
  checks: VerificationCheck[];
}

export interface VerificationCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message?: string;
}

export interface VerificationSummary {
  totalTools: number;
  verifiedCount: number;
  warningCount: number;
  failureCount: number;
  reports: ToolVerificationReport[];
}

export class VerificationEngine {
  private validator = new ToolSchemaValidator();

  verifyTool(tool: IntermediateToolDefinition): ToolVerificationReport {
    const checks: VerificationCheck[] = [];
    let confidence = tool.metadata.confidence || 0.85;

    // Check 1: Schema Structure
    const schemaReport = this.validator.validate(tool);
    if (schemaReport.valid) {
      checks.push({ name: "schema_validation", status: "pass" });
    } else {
      checks.push({
        name: "schema_validation",
        status: "fail",
        message: schemaReport.errors.join("; "),
      });
      confidence -= 0.3;
    }

    if (schemaReport.warnings.length > 0) {
      checks.push({
        name: "schema_quality",
        status: "warn",
        message: schemaReport.warnings.join("; "),
      });
      confidence -= 0.05;
    }

    // Check 2: Risk Classification
    if (tool.risk && tool.risk.level) {
      checks.push({
        name: "risk_classification",
        status: "pass",
        message: `Risk level: ${tool.risk.level}`,
      });
    } else {
      checks.push({
        name: "risk_classification",
        status: "fail",
        message: "No risk level assigned",
      });
      confidence -= 0.15;
    }

    // Check 3: Execution Target Safety
    const executionCheck = this.verifyExecutionSafety(tool);
    checks.push(executionCheck);
    if (executionCheck.status === "fail") {
      confidence -= 0.25;
    }

    // Bound confidence
    confidence = Math.max(0.1, Math.min(1.0, Math.round(confidence * 100) / 100));
    const verified = checks.every((c) => c.status !== "fail");

    return {
      toolName: tool.name,
      verified,
      confidence,
      checks,
    };
  }

  verifyAll(tools: IntermediateToolDefinition[]): VerificationSummary {
    const reports = tools.map((t) => this.verifyTool(t));

    return {
      totalTools: tools.length,
      verifiedCount: reports.filter((r) => r.verified).length,
      warningCount: reports.filter((r) => r.checks.some((c) => c.status === "warn")).length,
      failureCount: reports.filter((r) => !r.verified).length,
      reports,
    };
  }

  private verifyExecutionSafety(tool: IntermediateToolDefinition): VerificationCheck {
    if (tool.execution.type === "http") {
      const config = tool.execution.config as { method?: string; pathTemplate?: string };
      if (!config.method || !config.pathTemplate) {
        return {
          name: "execution_safety",
          status: "fail",
          message: "HTTP tool missing method or pathTemplate",
        };
      }
      return { name: "execution_safety", status: "pass" };
    }

    if (tool.execution.type === "process") {
      const config = tool.execution.config as { binary?: string };
      if (!config.binary) {
        return {
          name: "execution_safety",
          status: "fail",
          message: "CLI tool missing binary name",
        };
      }
      return { name: "execution_safety", status: "pass" };
    }

    if (tool.execution.type === "sql") {
      const config = tool.execution.config as { operation?: string };
      if (!config.operation) {
        return {
          name: "execution_safety",
          status: "fail",
          message: "SQL tool missing operation type",
        };
      }
      return { name: "execution_safety", status: "pass" };
    }

    return { name: "execution_safety", status: "pass" };
  }
}
