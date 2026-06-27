// ── Service Registry ──────────────────────────────────────────────────────────
// Allows modules to expose APIs (provide) and consume them (require).

export interface ServiceInfo {
  readonly name: string;
  readonly provider: string;
  readonly type: string;
}

export class ServiceRegistry {
  private services = new Map<string, { instance: unknown; provider: string }>();

  /**
   * Register a service that other modules can consume.
   */
  provide<T>(name: string, service: T, provider: string): void {
    if (this.services.has(name)) {
      const existing = this.services.get(name)!;
      throw new Error(
        `Service "${name}" already provided by "${existing.provider}"`,
      );
    }
    this.services.set(name, { instance: service, provider });
  }

  /**
   * Consume a service registered by another module.
   */
  require<T>(name: string): T {
    const entry = this.services.get(name);
    if (!entry) {
      throw new Error(
        `Service "${name}" not found. No module provides it.`,
      );
    }
    return entry.instance as T;
  }

  /**
   * Check if a service is available.
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get info about a service.
   */
  info(name: string): ServiceInfo | undefined {
    const entry = this.services.get(name);
    if (!entry) return undefined;
    return {
      name,
      provider: entry.provider,
      type: typeof entry.instance,
    };
  }

  /**
   * List all registered services.
   */
  list(): ServiceInfo[] {
    const result: ServiceInfo[] = [];
    for (const [name, entry] of this.services) {
      result.push({
        name,
        provider: entry.provider,
        type: typeof entry.instance,
      });
    }
    return result;
  }

  /**
   * Remove all services (used during full unload).
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Remove services provided by a specific module.
   */
  removeByProvider(provider: string): string[] {
    const removed: string[] = [];
    for (const [name, entry] of this.services) {
      if (entry.provider === provider) {
        this.services.delete(name);
        removed.push(name);
      }
    }
    return removed;
  }
}
