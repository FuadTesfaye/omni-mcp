import type { AdapterTarget } from "@omni-mcp/types";
import type { TargetClassification } from "@omni-mcp/types";

/**
 * Automatically classifies what type of target the user pointed at.
 *
 * mcpify ./thing -> TargetDetector -> "OpenAPI spec, confidence 0.97"
 */
export class TargetDetector {
  async detect(target: AdapterTarget): Promise<TargetClassification[]> {
    const raw = target.raw;
    const classifications: TargetClassification[] = [];

    // Explicit type override takes priority
    if (target.type) {
      classifications.push({
        type: target.type as TargetClassification["type"],
        confidence: 1.0,
        adapter: target.type,
        metadata: { explicit: true },
      });
      return classifications;
    }

    // URL-based detection
    if (this.isUrl(raw)) {
      classifications.push(...(await this.detectUrl(raw)));
    }
    // Database connection string
    else if (this.isDatabaseUri(raw)) {
      classifications.push(this.detectDatabaseUri(raw));
    }
    // File/directory path
    else {
      classifications.push(...(await this.detectPath(raw)));
    }

    // Sort by confidence descending
    return classifications.sort((a, b) => b.confidence - a.confidence);
  }

  private isUrl(raw: string): boolean {
    return raw.startsWith("http://") || raw.startsWith("https://");
  }

  private isDatabaseUri(raw: string): boolean {
    return /^(postgres|postgresql|mysql|mongodb|redis|sqlite):\/\//i.test(raw);
  }

  private async detectUrl(url: string): Promise<TargetClassification[]> {
    const results: TargetClassification[] = [];

    // Check URL patterns
    if (/\.(json|yaml|yml)$/i.test(url) || /openapi|swagger/i.test(url)) {
      results.push({
        type: "openapi",
        confidence: 0.9,
        adapter: "openapi",
        metadata: { url },
      });
    }

    if (/graphql/i.test(url)) {
      results.push({
        type: "graphql",
        confidence: 0.85,
        adapter: "graphql",
        metadata: { url },
      });
    }

    // Default: treat as website
    if (results.length === 0) {
      results.push({
        type: "website",
        confidence: 0.5,
        adapter: "web",
        metadata: { url },
      });
    }

    return results;
  }

  private detectDatabaseUri(uri: string): TargetClassification {
    const protocol = uri.split("://")[0].toLowerCase();
    const typeMap: Record<string, TargetClassification["type"]> = {
      postgres: "database-postgres",
      postgresql: "database-postgres",
      mysql: "database-mysql",
      mongodb: "database-mongodb",
      sqlite: "database-sqlite",
    };

    return {
      type: typeMap[protocol] || "unknown",
      confidence: 0.95,
      adapter: `database-${protocol}`,
      metadata: { protocol },
    };
  }

  private async detectPath(filePath: string): Promise<TargetClassification[]> {
    const results: TargetClassification[] = [];
    const fs = await import("fs/promises");

    try {
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const ext = filePath.split(".").pop()?.toLowerCase();

        if (ext === "json" || ext === "yaml" || ext === "yml") {
          const content = await fs.readFile(filePath, "utf-8");

          if (
            content.includes('"openapi"') ||
            content.includes("openapi:") ||
            content.includes('"swagger"') ||
            content.includes("swagger:")
          ) {
            results.push({
              type: "openapi",
              confidence: 0.98,
              adapter: "openapi",
              metadata: { file: filePath, ext },
            });
          }

          if (
            content.includes('"_type": "export"') ||
            (content.includes('"info"') && content.includes('"item"'))
          ) {
            results.push({
              type: "postman",
              confidence: 0.9,
              adapter: "postman",
              metadata: { file: filePath, ext },
            });
          }
        }

        if (ext === "proto") {
          results.push({
            type: "grpc",
            confidence: 0.95,
            adapter: "grpc",
            metadata: { file: filePath, ext },
          });
        }
      }

      if (stat.isDirectory()) {
        const entries = await fs.readdir(filePath);

        if (entries.includes("package.json") || entries.includes("tsconfig.json")) {
          results.push({
            type: "repository-typescript",
            confidence: 0.85,
            adapter: "typescript",
            metadata: { dir: filePath },
          });
        }

        if (entries.includes("pyproject.toml") || entries.includes("setup.py")) {
          results.push({
            type: "repository-python",
            confidence: 0.85,
            adapter: "python",
            metadata: { dir: filePath },
          });
        }

        if (entries.includes("go.mod")) {
          results.push({
            type: "repository-go",
            confidence: 0.85,
            adapter: "go",
            metadata: { dir: filePath },
          });
        }

        for (const entry of entries) {
          if (/openapi|swagger/i.test(entry) && /\.(json|ya?ml)$/i.test(entry)) {
            results.push({
              type: "openapi",
              confidence: 0.9,
              adapter: "openapi",
              metadata: { dir: filePath, specFile: entry },
            });
          }
        }
      }
    } catch {
      // Path doesn't exist - check if it's a CLI command
      try {
        const { execSync } = await import("child_process");
        execSync(`which ${filePath}`, { stdio: "pipe" });
        results.push({
          type: "cli",
          confidence: 0.8,
          adapter: "cli",
          metadata: { command: filePath },
        });
      } catch {
        // Unknown target
      }
    }

    if (results.length === 0) {
      results.push({
        type: "unknown",
        confidence: 0.1,
        adapter: "unknown",
        metadata: { raw: filePath },
      });
    }

    return results;
  }
}
