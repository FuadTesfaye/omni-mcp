import ora from "ora";
import chalk from "chalk";
import { McpifyPipeline, AdapterRegistry } from "@omni-mcp/core";
import { OpenApiAdapter } from "@omni-mcp/adapter-openapi";
import { CliAdapter } from "@omni-mcp/adapter-cli";
import { PostmanAdapter } from "@omni-mcp/adapter-postman";
import { DatabaseAdapter } from "@omni-mcp/adapter-database";
import { VerificationEngine } from "@omni-mcp/verification";

export async function inspectCommand(
  source: string,
  options: { type?: string }
) {
  console.log(chalk.bold("\n\u{1F50D} Omni-MCP \u2014 Inspect Target\n"));

  const registry = new AdapterRegistry();
  registry.register(new OpenApiAdapter());
  registry.register(new CliAdapter());
  registry.register(new PostmanAdapter());
  registry.register(new DatabaseAdapter());
  const pipeline = new McpifyPipeline(registry);

  const spinner = ora("Inspecting...").start();

  try {
    const result = await pipeline.run({ raw: source, type: options.type });
    spinner.succeed("Inspection complete");

    console.log(chalk.gray(`\n  Target: ${source}`));
    console.log(chalk.gray(`  Type: ${result.sourceType}\n`));

    console.log(chalk.bold("  Discovered:"));
    console.log(`    ${result.stats.discovered} capabilities`);
    console.log(`    ${result.stats.generated} MCP tools generated`);
    console.log(
      `    ${result.stats.groups.length} groups: ${result.stats.groups.join(", ")}`
    );
    console.log();

    console.log(chalk.bold("  Tools:"));
    for (const tool of result.tools) {
      const riskColor =
        tool.risk.level === "low"
          ? chalk.green
          : tool.risk.level === "medium"
            ? chalk.yellow
            : chalk.red;

      console.log(
        `    ${riskColor("\u25CF")} ${chalk.white(tool.name)} ${chalk.gray(`\u2014 ${tool.description.slice(0, 60)}`)}`
      );
    }

    // Verification report
    const verifier = new VerificationEngine();
    const verification = verifier.verifyAll(result.tools);

    console.log(chalk.bold("  Verification:"));
    console.log(chalk.green(`    ${verification.verifiedCount} capabilities verified`));
    if (verification.warningCount > 0) {
      console.log(chalk.yellow(`    ${verification.warningCount} quality notices`));
    }
    if (verification.failureCount > 0) {
      console.log(chalk.red(`    ${verification.failureCount} failed checks`));
    }

    console.log(chalk.gray(`\n  Warnings:`));
    const lowConfidence = result.tools.filter(
      (t) => t.metadata.confidence < 0.8
    );
    if (lowConfidence.length > 0) {
      console.log(
        chalk.yellow(
          `    ${lowConfidence.length} capabilities have low confidence`
        )
      );
    } else {
      console.log(chalk.green("    No warnings"));
    }
    console.log();
  } catch (error: unknown) {
    const err = error as Error;
    spinner.fail(chalk.red("Inspection failed"));
    console.error(chalk.red(`  ${err.message}`));
    process.exit(1);
  }
}
