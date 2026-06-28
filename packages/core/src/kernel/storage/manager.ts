import type { StorageProvider, StorageDriver, ModuleStorageConfig, MysqlConfig } from './types.ts';
import { JsonProvider } from './providers/json.provider.ts';
import { SqliteProvider } from './providers/sqlite.provider.ts';
import { YamlProvider } from './providers/yaml.provider.ts';
import { SharedMysqlPool, SharedMysqlProvider } from './providers/mysql.provider.ts';
import { LitLogger } from '../logger.ts';
import { resolve } from 'node:path';

// ── Storage Manager ───────────────────────────────────────────────────────────

/**
 * Manages per-module isolated storage.
 * Each module gets its own StorageProvider instance (own file, own DB, own table).
 */
export class StorageManager {
  private modules = new Map<string, StorageProvider>();
  private mysqlPool: SharedMysqlPool | null = null;

  /**
   * Initialize the shared MySQL pool if any module uses MySQL.
   * Called once during bootstrap.
   */
  async initMysql(config: MysqlConfig): Promise<void> {
    this.mysqlPool = new SharedMysqlPool(config);
    await this.mysqlPool.init();
  }

  /**
   * Create an isolated storage provider for a module.
   *
   * - json:   `.biscotto/data/<ModuleName>/store.json`
   * - sqlite: `.biscotto/data/<ModuleName>/store.db`
   * - yaml:   `.biscotto/data/<ModuleName>/store.yaml`
   * - mysql:  table `<ModuleName>_store` (shared pool)
   */
  async createModuleStorage(
    root: string,
    moduleName: string,
    config: ModuleStorageConfig,
  ): Promise<StorageProvider> {
    const provider = await this.createProvider(root, moduleName, config.driver);
    await provider.init();
    this.modules.set(moduleName, provider);
    LitLogger.debug('Storage', `Created ${config.driver.toUpperCase()} storage for ${moduleName}`);
    return provider;
  }

  /** Get the storage provider for a module. */
  getModuleStorage(moduleName: string): StorageProvider | undefined {
    return this.modules.get(moduleName);
  }

  /** Close storage for a specific module. */
  async closeModule(moduleName: string): Promise<void> {
    const provider = this.modules.get(moduleName);
    if (provider) {
      await provider.close();
      this.modules.delete(moduleName);
    }
  }

  /** Close all module storages. */
  async closeAll(): Promise<void> {
    for (const [, provider] of this.modules) {
      await provider.close();
    }
    this.modules.clear();

    if (this.mysqlPool) {
      await this.mysqlPool.close();
      this.mysqlPool = null;
    }

    LitLogger.info('Storage', 'All storage closed');
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async createProvider(
    root: string,
    moduleName: string,
    driver: StorageDriver,
  ): Promise<StorageProvider> {
    const dataDir = resolve(root, '.biscotto', 'data', moduleName);

    switch (driver) {
      case 'json': {
        return new JsonProvider(resolve(dataDir, 'store.json'));
      }
      case 'sqlite': {
        return new SqliteProvider(resolve(dataDir, 'store.db'));
      }
      case 'yaml': {
        return new YamlProvider(resolve(dataDir, 'store.yaml'));
      }
      case 'mysql': {
        if (!this.mysqlPool) {
          throw new Error('MySQL pool not initialized. Ensure MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE env vars are set.');
        }
        return new SharedMysqlProvider(this.mysqlPool, moduleName);
      }
      default:
        throw new Error(`Unknown storage driver: ${driver}`);
    }
  }
}

// ── NamespacedStorage (kept for backward compat) ──────────────────────────────

/**
 * Key-prefix wrapper around a StorageProvider.
 * Kept for backward compatibility but not recommended for new code.
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
