/**
 * The Canonical Intermediate Tool Definition.
 * All adapters convert their input into this format.
 * The MCP gateway converts this format into MCP tools.
 */
export interface IntermediateToolDefinition {
  /** Unique identifier for this tool */
  id: string;

  /** Machine-friendly tool name (snake_case) */
  name: string;

  /** Human-friendly display title */
  title?: string;

  /** AI-friendly description of what this tool does */
  description: string;

  /** Where this tool was discovered from */
  source: ToolSource;

  /** JSON Schema for tool input parameters */
  inputSchema: JsonSchema;

  /** JSON Schema for expected output (optional) */
  outputSchema?: JsonSchema;

  /** How to execute this tool */
  execution: ExecutionConfig;

  /** Authentication requirements */
  auth?: AuthConfig;

  /** Risk assessment */
  risk: RiskAssessment;

  /** Required permission scopes */
  permissions?: PermissionConfig;

  /** Metadata about the tool */
  metadata: ToolMetadata;
}

export interface ToolSource {
  type: SourceType;
  /** Original identifier (URL, file path, connection string, etc.) */
  identifier: string;
  /** Original operation ID or name from the source */
  originalName?: string;
}

export type SourceType =
  | "openapi"
  | "graphql"
  | "grpc"
  | "cli"
  | "database"
  | "web"
  | "package"
  | "repository"
  | "postman"
  | "custom";

export interface ExecutionConfig {
  type: ExecutionType;
  config: Record<string, unknown>;
}

export type ExecutionType =
  | "http"
  | "graphql"
  | "grpc"
  | "process"
  | "sql"
  | "browser"
  | "sdk";

export interface HttpExecutionConfig {
  method: string;
  pathTemplate: string;
  baseUrl: string;
  parameters: HttpParameter[];
  requestBodyContentType?: string;
  headers?: Record<string, string>;
}

export interface HttpParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: JsonSchema;
}

export interface AuthConfig {
  type: "apiKey" | "oauth2" | "bearer" | "basic" | "cookie" | "custom";
  required: boolean;
  config?: Record<string, unknown>;
}

export interface RiskAssessment {
  level: RiskLevel;
  /** What actions this tool performs */
  actions: string[];
  /** Whether this tool requires explicit approval */
  requiresApproval?: boolean;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PermissionConfig {
  scopes: string[];
}

export interface ToolMetadata {
  tags: string[];
  /** How confident we are this tool is correctly generated (0-1) */
  confidence: number;
  /** Whether this was auto-generated vs manually defined */
  generated: boolean;
  /** Tool group/domain for hierarchical organization */
  group?: string;
  /** Original examples from the source */
  examples?: ToolExample[];
}

export interface ToolExample {
  input: Record<string, unknown>;
  output?: unknown;
  description?: string;
}

/** JSON Schema type (simplified for our usage) */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  [key: string]: unknown;
}
