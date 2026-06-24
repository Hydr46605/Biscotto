import type { StorageConfig, StorageProvider, StorageDriver } from './types.ts';
import { JsonProvider } from './providers/json.provider.ts';
import { SqliteProvider } from './providers/sqlite.provider.ts';
import { YamlProvider } from './providers/yaml.provider.ts';
import { MysqlProvider } from './providers/mysql.provider.ts';
import { LitLogger } from '../logger.ts';

export class StorageManager {
  private provider: StorageProvider | null = null;
  private namespaces = new Map<string, StorageProvider>();

  constructor(private readonly config: StorageConfig) {}

  async init(): Promise<void> {
    this.provider = await this.create(this.config.driver);
    LitLogger.info('Storage', `Initialized ${this.config.driver.toUpperCase()} storage`);
  }

  /**
   * Get a namespaced storage instance.
   * Each namespace gets its own table/collection/prefix.
   */
  namespace(name: string): NamespacedStorage {
    if (!this.namespaces.has(name)) {
      const prefixed = this.createPrefixed(name);
      this.namespaces.set(name, prefixed);
    }
    return new NamespacedStorage(this.namespaces.get(name)!, name);
  }

  /** Direct access to the raw provider (no namespacing). */
  raw(): StorageProvider {
    if (!this.provider) throw new Error('Storage not initialized');
    return this.provider;
  }

  async close(): Promise<void> {
    for (const [, ns] of this.namespaces) {
      await ns.close();
    }
    await this.provider?.close();
    this.namespaces.clear();
    this.provider = null;
    LitLogger.info('Storage', 'Storage closed');
  }

  private async create(driver: StorageDriver): Promise<StorageProvider> {
    switch (driver) {
      case 'json': {
        const path = this.config.json?.path ?? './data/store.json';
        const p = new JsonProvider(path);
        await p.init();
        return p;
      }
      case 'sqlite': {
        const path = this.config.sqlite?.path ?? './data/store.db';
        const p = new SqliteProvider(path);
        await p.init();
        return p;
      }
      case 'yaml': {
        const path = this.config.yaml?.path ?? './data/store.yaml';
        const p = new YamlProvider(path);
        await p.init();
        return p;
      }
      case 'mysql': {
        if (!this.config.mysql) throw new Error('MySQL config is required');
        const p = new MysqlProvider(this.config.mysql);
        await p.init();
        return p;
      }
      default:
        throw new Error(`Unknown storage driver: ${driver}`);
    }
  }

  private createPrefixed(_namespace: string): StorageProvider {
    // For now, we use the same underlying provider with key prefixing.
    // In a future version, we could use separate tables/collections.
    if (!this.provider) throw new Error('Storage not initialized');
    return this.provider;
  }
}

/**
 * Namespaced storage wrapper that prefixes all keys.
 */
export class NamespacedStorage {
  constructor(
    private readonly provider: StorageProvider,
    private readonly namespace: string,
  ) {}

  private prefix(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.provider.get<T>(this.prefix(key));
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    return this.provider.set<T>(this.prefix(key), value);
  }

  async delete(key: string): Promise<boolean> {
    return this.provider.delete(this.prefix(key));
  }

  async has(key: string): Promise<boolean> {
    return this.provider.has(this.prefix(key));
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    const all = await this.provider.all<T>();
    const prefix = this.prefix('');
    const filtered = new Map<string, T>();
    for (const [key, value] of all) {
      if (key.startsWith(prefix)) {
        filtered.set(key.slice(prefix.length), value);
      }
    }
    return filtered;
  }

  async clear(): Promise<void> {
    const all = await this.provider.all();
    const prefix = this.prefix('');
    for (const key of all.keys()) {
      if (key.startsWith(prefix)) {
        await this.provider.delete(key);
      }
    }
  }
}
