export type StorageDriver = 'json' | 'sqlite' | 'yaml' | 'mysql';

export interface StorageConfig {
  driver: StorageDriver;
  json?: {
    path: string;
  };
  sqlite?: {
    path: string;
  };
  yaml?: {
    path: string;
  };
  mysql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
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
