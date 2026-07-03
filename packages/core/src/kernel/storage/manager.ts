import type { StorageProvider, StorageDriver, ModuleStorageConfig, MysqlConfig } from './types.js';
import { JsonProvider } from './providers/json.provider.js';
import { SqliteProvider } from './providers/sqlite.provider.js';
import { YamlProvider } from './providers/yaml.provider.js';
import { SharedMysqlPool, SharedMysqlProvider } from './providers/mysql.provider.js';
import { LitLogger } from '../logger.js';
import { resolve } from 'node:path';

// ── Storage Manager ───────────────────────────────────────────────────────────

/**
 * Manages per-module isolated storage.
 * Each module gets its own StorageProvider instance (own file, own DB,
 * own table). All MySQL modules share a single connection pool.
 *
 * Renamed from `StorageManager` to `ModuleStorageManager` in v1.9.0 to
 * make the "per-module" semantics explicit (legacy global StorageManager
 * was retired earlier).
 */
export class ModuleStorageManager {
  private modules = new Map<string, StorageProvider>();
  private mysqlPool: SharedMysqlPool | null = null;

  async initMysql(config: MysqlConfig): Promise<void> {
    this.mysqlPool = new SharedMysqlPool(config);
    await this.mysqlPool.init();
  }

  /**
   * Create an isolated storage provider for a module.
   * Storage targets:
   *   json:   .biscotto/data/<ModuleName>/store.json
   *   sqlite: .biscotto/data/<ModuleName>/store.db
   *   yaml:   .biscotto/data/<ModuleName>/store.yaml
   *   mysql:  table <ModuleName>_store (shared pool)
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

  getModuleStorage(moduleName: string): StorageProvider | undefined {
    return this.modules.get(moduleName);
  }

  async closeModule(moduleName: string): Promise<void> {
    const provider = this.modules.get(moduleName);
    if (provider) {
      await provider.close();
      this.modules.delete(moduleName);
    }
  }

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
