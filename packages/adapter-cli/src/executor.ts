import { spawn } from "child_process";
import type { ExecutionContext, ExecutionResult } from "@omni-mcp/types";

export interface CliExecutionConfig {
  binary: string;
  subcommand?: string;
  argv: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Executes a CLI process securely with typed arguments.
 * Never invokes the shell (shell: false).
 */
export async function executeCliProcess(
  config: CliExecutionConfig,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const timeoutMs = config.timeoutMs || context.timeoutMs || 30000;

  return new Promise((resolve) => {
    const [file, ...args] = config.argv;

    let stdout = "";
    let stderr = "";
    let killed = false;

    const proc = spawn(file, args, {
      cwd: config.cwd || process.cwd(),
      env: {
        ...process.env,
        ...(config.env || {}),
        ...(context.credentials || {}),
      },
      shell: false, // Critical security safeguard: never shell=true
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          // Process already exited
        }
      }, 2000);
    }, timeoutMs);

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: {
          code: "CLI_SPAWN_ERROR",
          message: err.message,
          category: "sandbox",
          retryable: false,
          details: { file, args },
        },
        metadata: {
          durationMs: Date.now() - startTime,
          source: "cli",
          requestId: context.requestId,
        },
      });
    });

    proc.on("close", (exitCode: number | null) => {
      clearTimeout(timer);

      if (killed) {
        resolve({
          success: false,
          error: {
            code: "CLI_TIMEOUT",
            message: `Command timed out after ${timeoutMs}ms`,
            category: "timeout",
            retryable: true,
          },
          metadata: {
            durationMs: Date.now() - startTime,
            source: "cli",
            requestId: context.requestId,
          },
        });
        return;
      }

      if (exitCode !== 0) {
        resolve({
          success: false,
          error: {
            code: `CLI_EXIT_${exitCode ?? "UNKNOWN"}`,
            message: stderr || stdout || `Process exited with code ${exitCode}`,
            category: "upstream",
            retryable: exitCode !== 127 && exitCode !== 126,
            details: { exitCode, stderr, stdout },
          },
          metadata: {
            durationMs: Date.now() - startTime,
            source: "cli",
            requestId: context.requestId,
          },
        });
        return;
      }

      // Try parsing JSON output, fallback to raw text
      let data: unknown = stdout.trim();
      try {
        data = JSON.parse(stdout);
      } catch {
        // Keep string data
      }

      resolve({
        success: true,
        data,
        metadata: {
          durationMs: Date.now() - startTime,
          source: "cli",
          requestId: context.requestId,
        },
      });
    });
  });
}
