import type { IntermediateToolDefinition } from "./intermediate.js";

/**
 * Every input type gets an adapter implementing this interface.
 * This is the extension point for the adapter ecosystem.
 */
export interface OmniAdapter {
  /** Unique name for this adapter */
  name: string;

  /** Human-readable description */
  description: string;

  /** Supported source types */
  sourceTypes: string[];

  /** Detect if this adapter can handle the given target */
  detect(input: AdapterTarget): Promise<DetectionResult>;

  /** Inspect the target and discover capabilities */
  inspect(input: AdapterTarget): Promise<InspectionResult>;

  /** Convert discovered capabilities into intermediate tool definitions */
  synthesize(inspection: InspectionResult): Promise<IntermediateToolDefinition[]>;

  /** Execute a tool call against the target system */
  execute(
    tool: IntermediateToolDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
}

export interface AdapterTarget {
  /** The raw input (URL, file path, connection string, etc.) */
  raw: string;
  /** Explicit type override */
  type?: string;
  /** Additional options */
  options?: Record<string, unknown>;
}

export interface DetectionResult {
  /** Whether this adapter can handle the target */
  detected: boolean;
  /** Confidence score 0-1 */
  confidence: number;
  /** Detected target type */
  type?: string;
  /** Additional detection metadata */
  metadata?: Record<string, unknown>;
}

export interface InspectionResult {
  /** Source identifier */
  source: string;
  /** What type of source this is */
  sourceType: string;
  /** Raw discovered capabilities before synthesis */
  capabilities: DiscoveredCapability[];
  /** Authentication info discovered */
  auth?: {
    type: string;
    schemes: string[];
  };
  /** Metadata about the source */
  metadata: Record<string, unknown>;
}

export interface DiscoveredCapability {
  /** Original name/identifier */
  name: string;
  /** Original description */
  description?: string;
  /** Raw schema/type information */
  rawSchema?: unknown;
  /** Confidence in this capability */
  confidence: "confirmed" | "inferred" | "unknown";
  /** Category/tag */
  tags?: string[];
}

export interface ExecutionContext {
  /** Request ID for tracing */
  requestId: string;
  /** Authentication credentials (never exposed to the model) */
  credentials?: Record<string, string>;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: ToolExecutionError;
  metadata?: {
    durationMs: number;
    source: string;
    requestId: string;
  };
}

export interface ToolExecutionError {
  code: string;
  message: string;
  category:
    | "validation"
    | "authentication"
    | "authorization"
    | "upstream"
    | "timeout"
    | "sandbox"
    | "unknown";
  retryable: boolean;
  details?: unknown;
}
