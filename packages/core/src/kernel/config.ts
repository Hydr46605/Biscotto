import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { LitLogger } from './logger.ts';
import type { MysqlConfig } from './storage/types.ts';

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

// MySQL config — shared pool, loaded from env if any module uses MySQL
const mysql: MysqlConfig | undefined = process.env.MYSQL_HOST ? {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'biscotto',
} : undefined;

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID ?? null,
  modulesPath: resolve(process.cwd(), 'src', 'modules'),
  mysql,
} as const;
