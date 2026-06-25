import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { LitLogger } from './logger.ts';
import type { StorageConfig, StorageDriver } from './storage/types.ts';

const envPath = resolve(process.cwd(), '.env');
loadDotenv({ path: envPath });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    LitLogger.error('Config', `Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  LitLogger.debug('Config', `Loaded ${key} = ${key.includes('TOKEN') ? '***' : value}`);
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key] ?? fallback;
  LitLogger.debug('Config', `Loaded ${key} = ${value}`);
  return value;
}

const storageDriver = (process.env.STORAGE_DRIVER ?? 'json') as StorageDriver;

const storage: StorageConfig = {
  driver: storageDriver,
  json: {
    path: resolve(process.cwd(), process.env.STORAGE_JSON_PATH ?? './data/store.json'),
  },
  sqlite: {
    path: resolve(process.cwd(), process.env.STORAGE_SQLITE_PATH ?? './data/store.db'),
  },
  yaml: {
    path: resolve(process.cwd(), process.env.STORAGE_YAML_PATH ?? './data/store.yaml'),
  },
  mysql: storageDriver === 'mysql' ? {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'hydrotto',
  } : undefined,
};

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID ?? null,
  modulesPath: resolve(process.cwd(), 'src', 'modules'),
  storage,
} as const;
