import { describe, it, expect } from "bun:test";
import { CliAnalyzer } from "../analyzer.js";
import { ArgvBuilder } from "../builder.js";
import { CliAdapter } from "../index.js";

describe("CliAnalyzer", () => {
  const analyzer = new CliAnalyzer();

  const sampleHelp = `
Usage: git [options] <command> [<args>]

These are common Git commands used in various situations:

Commands:
   clone             Clone a repository into a new directory
   init              Create an empty Git repository
   add               Add file contents to the index
   commit            Record changes to the repository
   status            Show the working tree status

Options:
   -v, --version      Display version information
   -h, --help         Display help message
   -C <path>          Run as if git was started in <path>
   --exec-path[=<path>] Path to where your core Git programs are installed
   --bare             Treat the repository as a bare repository
`;

  it("parses subcommands and options from help text", () => {
    const info = analyzer.parseHelpText("git", sampleHelp);

    expect(info.name).toBe("git");
    expect(info.subcommands.length).toBeGreaterThanOrEqual(4);

    const cloneCmd = info.subcommands.find((s) => s.name === "clone");
    expect(cloneCmd).toBeDefined();
    expect(cloneCmd?.description).toContain("Clone a repository");

    const versionOpt = info.options.find((o) => o.name === "version");
    expect(versionOpt).toBeDefined();
    expect(versionOpt?.type).toBe("boolean");

    const bareOpt = info.options.find((o) => o.name === "bare");
    expect(bareOpt).toBeDefined();
    expect(bareOpt?.type).toBe("boolean");
  });
});

describe("ArgvBuilder", () => {
  const builder = new ArgvBuilder();

  it("builds safe argv arrays from JSON without shell injection", () => {
    const argv = builder.build({
      binary: "git",
      subcommand: "log",
      options: [
        {
          name: "max_count",
          flag: "--max-count",
          description: "Limit commits",
          type: "number",
          required: false,
        },
        {
          name: "oneline",
          flag: "--oneline",
          description: "Compact format",
          type: "boolean",
          required: false,
        },
      ],
      input: {
        max_count: 20,
        oneline: true,
        // Attempt shell injection string
        filter: "; rm -rf /",
      },
    });

    expect(argv).toEqual([
      "git",
      "log",
      "--max-count",
      "20",
      "--oneline",
      "--filter",
      "; rm -rf /", // Treated as a discrete argument token, NOT evaluated by shell!
    ]);
  });
});

describe("CliAdapter", () => {
  const adapter = new CliAdapter();

  it("detects system commands", async () => {
    const result = await adapter.detect({ raw: "ls" });
    expect(result.detected).toBe(true);
    expect(result.type).toBe("cli");
  });

  it("rejects non-cli targets", async () => {
    const result = await adapter.detect({ raw: "https://api.example.com/spec.json" });
    expect(result.detected).toBe(false);
  });
});
