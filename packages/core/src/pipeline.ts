import type {
  AdapterTarget,
  IntermediateToolDefinition,
  ExecutionContext,
  ExecutionResult,
} from "@omni-mcp/types";
import { TargetDetector } from "./detector.js";
import { AdapterRegistry } from "./registry.js";
import { SchemaNormalizer } from "./normalizer.js";

export interface McpifyResult {
  tools: IntermediateToolDefinition[];
  source: string;
  sourceType: string;
  stats: {
    discovered: number;
    generated: number;
    readTools: number;
    mutationTools: number;
    destructiveTools: number;
    groups: string[];
  };
}

/**
 * The main pipeline orchestrator.
 * This is what `mcpify <anything>` runs.
 *
 * Target -> Detect -> Select Adapter -> Inspect -> Synthesize -> Normalize -> Result
 */
export class McpifyPipeline {
  private detector = new TargetDetector();
  private normalizer = new SchemaNormalizer();

  constructor(private registry: AdapterRegistry) {}

  async run(target: AdapterTarget): Promise<McpifyResult> {
    // Step 1: Detect target type
    const classifications = await this.detector.detect(target);

    if (classifications.length === 0 || classifications[0].type === "unknown") {
      throw new Error(
        `Could not detect target type for: ${target.raw}\n` +
          `Use --type to specify explicitly: mcpify ${target.raw} --type openapi`
      );
    }

    const best = classifications[0];

    // Step 2: Select adapter
    const adapter = this.registry.get(best.adapter);
    if (!adapter) {
      throw new Error(
        `No adapter found for type "${best.type}" (adapter: ${best.adapter}).\n` +
          `Available adapters: ${this.registry
            .getAll()
            .map((a) => a.name)
            .join(", ")}`
      );
    }

    // Step 3: Inspect the target
    const inspection = await adapter.inspect(target);

    // Step 4: Synthesize intermediate tool definitions
    let tools = await adapter.synthesize(inspection);

    // Step 5: Normalize names, descriptions, and risk levels
    tools = tools.map((tool) => ({
      ...tool,
      name: this.normalizer.normalizeName(tool.name),
      description: this.normalizer.normalizeDescription(
        (tool.execution.config as Record<string, unknown>)?.method as string,
        (tool.execution.config as Record<string, unknown>)?.pathTemplate as string,
        tool.description
      ),
      risk: this.normalizer.classifyRisk(tool),
    }));

    // Step 6: Compute stats
    const groups = [
      ...new Set(tools.map((t) => t.metadata.group || "ungrouped")),
    ];
    const stats = {
      discovered: inspection.capabilities.length,
      generated: tools.length,
      readTools: tools.filter((t) => t.risk.level === "low").length,
      mutationTools: tools.filter((t) => t.risk.level === "medium").length,
      destructiveTools: tools.filter(
        (t) => t.risk.level === "high" || t.risk.level === "critical"
      ).length,
      groups,
    };

    return {
      tools,
      source: target.raw,
      sourceType: best.type,
      stats,
    };
  }

  /**
   * Execute a tool call through the appropriate adapter
   */
  async execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const adapter = this.registry.get(
      tool.source.type === "openapi" ? "openapi" : tool.source.type
    );

    if (!adapter) {
      return {
        success: false,
        error: {
          code: "ADAPTER_NOT_FOUND",
          message: `No adapter for source type: ${tool.source.type}`,
          category: "unknown",
          retryable: false,
        },
      };
    }

    const startTime = Date.now();

    try {
      const result = await adapter.execute(tool, input, context);
      return {
        ...result,
        metadata: {
          durationMs: Date.now() - startTime,
          source: tool.source.type,
          requestId: context.requestId,
        },
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: {
          code: "EXECUTION_FAILED",
          message: err.message || "Unknown execution error",
          category: "upstream",
          retryable: true,
          details: error,
        },
        metadata: {
          durationMs: Date.now() - startTime,
          source: tool.source.type,
          requestId: context.requestId,
        },
      };
    }
  }
}
