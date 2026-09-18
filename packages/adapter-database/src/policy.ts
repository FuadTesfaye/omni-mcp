export interface DatabaseSecurityPolicy {
  /** Enforce read-only access (default: true) */
  readOnly: boolean;

  /** Allowed tables (empty means all non-system tables allowed) */
  allowTables?: string[];

  /** Disallowed tables */
  denyTables: string[];

  /** Max rows that can be fetched in a single query */
  maxLimit: number;

  /** Require approval for mutations if writes are enabled */
  requireApprovalForWrites: boolean;
}

export const DEFAULT_DATABASE_POLICY: DatabaseSecurityPolicy = {
  readOnly: true,
  denyTables: [
    "sqlite_master",
    "sqlite_sequence",
    "sqlite_stat1",
    "information_schema",
    "pg_catalog",
    "password",
    "passwords",
    "secrets",
    "credentials",
  ],
  maxLimit: 100,
  requireApprovalForWrites: true,
};
