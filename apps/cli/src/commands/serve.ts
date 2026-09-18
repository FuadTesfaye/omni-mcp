import chalk from "chalk";

export async function serveCommand(_options: {
  transport: string;
  port: string;
  manifest: string;
}) {
  console.error(
    chalk.yellow(
      "Note: In Phase 1, use `mcpify <source> --serve` instead.\n" +
        "The `serve` command from manifest will be available in Phase 2."
    )
  );
  process.exit(1);
}
