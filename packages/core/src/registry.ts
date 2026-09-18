import type { OmniAdapter } from "@omni-mcp/types";

/**
 * Central registry for all adapters.
 * Adapters register themselves here, and the pipeline
 * selects the appropriate adapter based on detection results.
 */
export class AdapterRegistry {
  private adapters = new Map<string, OmniAdapter>();

  register(adapter: OmniAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): OmniAdapter | undefined {
    return this.adapters.get(name);
  }

  getAll(): OmniAdapter[] {
    return Array.from(this.adapters.values());
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }
}
