export interface TargetClassification {
  type: TargetType;
  confidence: number;
  adapter: string;
  metadata: Record<string, unknown>;
}

export type TargetType =
  | "openapi"
  | "postman"
  | "graphql"
  | "grpc"
  | "cli"
  | "database-postgres"
  | "database-mysql"
  | "database-sqlite"
  | "database-mongodb"
  | "repository-typescript"
  | "repository-python"
  | "repository-go"
  | "website"
  | "unknown";
