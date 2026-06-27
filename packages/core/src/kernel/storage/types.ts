export type StorageDriver = 'json' | 'sqlite' | 'yaml' | 'mysql';

/**
 * MySQL connection config shared across all modules.
 * Each module gets its own table with a <ModuleName>_ prefix.
 */
export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Storage configuration declared per-module in the manifest.
 * Each module chooses its own driver and options.
 */
export interface ModuleStorageConfig {
  driver: StorageDriver;
}

export interface StorageProvider {
  readonly driver: StorageDriver;
  init(): Promise<void>;
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  all<T = unknown>(): Promise<Map<string, T>>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
