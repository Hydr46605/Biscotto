import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { LitLogger } from './logger.ts';

const log = LitLogger.child('Config');

const envPath = resolve(process.cwd(), '.env');
loadDotenv({ path: envPath });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    log.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  log.debug(`Loaded ${key} = ${key.includes('TOKEN') ? '***' : value}`);
  return value;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID ?? null,
  modulesPath: resolve(process.cwd(), 'src', 'modules'),
} as const;
