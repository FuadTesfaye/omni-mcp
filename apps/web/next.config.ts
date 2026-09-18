import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@omni-mcp/core",
    "@omni-mcp/adapter-openapi",
    "@omni-mcp/mcp",
    "@omni-mcp/types",
  ],
};

export default nextConfig;
