import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { LitLogger } from './logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  default?: unknown;
  required?: boolean;
}

export interface ConfigSchema {
  [key: string]: ConfigField;
}

export interface ModuleConfig<T = Record<string, unknown>> {
  readonly schema: ConfigSchema;
  readonly defaults: T;
}

// ── Module Data Directory ─────────────────────────────────────────────────────

/**
 * Per-module data directory: `.biscotto/configs/<ModuleName>/`
 *
 * Provides:
 * - Structured JSON config (config.json) with schema + defaults
 * - Free file access for any other files (images, cards, data, etc.)
 */
export class ModuleData {
  private readonly dir: string;
  private readonly name: string;
  private configCache: Record<string, unknown> | null = null;
  private configCacheKey: string | null = null;

  constructor(root: string, moduleName: string) {
    this.name = moduleName;
    this.dir = resolve(root, '.biscotto', 'configs', moduleName);
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  // ── Config (JSON) ────────────────────────────────────────────────────────

  private getConfigPath(): string {
    return join(this.dir, 'config.json');
  }

  /**
   * Load config with schema validation and defaults merging.
   * Creates default config if not exists.
   */
  loadConfig<T extends Record<string, unknown>>(
    schema: ConfigSchema,
    defaults: T,
  ): T {
    const cacheKey = JSON.stringify({ schema, defaults });
    if (this.configCache && this.configCacheKey === cacheKey) {
      return this.configCache as T;
    }

    const configPath = this.getConfigPath();

    if (!existsSync(configPath)) {
      this.saveConfig(defaults);
      this.configCache = defaults;
      this.configCacheKey = cacheKey;
      LitLogger.debug('Data', `Created default config for ${this.name}`);
      return defaults;
    }

    try {
      const raw = readFileSync(configPath, 'utf-8');
      const stored = JSON.parse(raw) as Record<string, unknown>;
      const merged = this.mergeWithDefaults(stored, defaults, schema);

      if (JSON.stringify(merged) !== JSON.stringify(stored)) {
        this.saveConfig(merged);
        LitLogger.debug('Data', `Updated config for ${this.name} with new defaults`);
      }

      this.configCache = merged;
      this.configCacheKey = cacheKey;
      return merged as T;
    } catch (error) {
      LitLogger.error('Data', `Failed to load config for ${this.name}: ${error}`);
      this.configCache = defaults;
      this.configCacheKey = cacheKey;
      return defaults;
    }
  }

  /** Save the full config object. */
  saveConfig(config: Record<string, unknown>): void {
    writeFileSync(this.getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
    this.configCache = config;
    this.configCacheKey = null;
  }

  /** Get a single config value. */
  getConfig<T>(key: string): T | undefined {
    if (!this.configCache) return undefined;
    return this.configCache[key] as T;
  }

  /** Set a single config value and persist. */
  setConfig(key: string, value: unknown): void {
    const config = this.configCache ?? {};
    config[key] = value;
    this.saveConfig(config);
  }

  /** Get all config keys. */
  configKeys(): string[] {
    return this.configCache ? Object.keys(this.configCache) : [];
  }

  /** Check if config file exists. */
  hasConfig(): boolean {
    return existsSync(this.getConfigPath());
  }

  /** Delete the config file. */
  deleteConfig(): boolean {
    const path = this.getConfigPath();
    if (existsSync(path)) {
      unlinkSync(path);
      this.configCache = null;
      this.configCacheKey = null;
      return true;
    }
    return false;
  }

  // ── Free File Access ─────────────────────────────────────────────────────

  private safePath(filename: string): string {
    const target = resolve(this.dir, filename);
    const rel = relative(this.dir, target);
    if (rel.startsWith('..') || rel === '') {
      throw new Error(`Path traversal blocked: ${filename}`);
    }
    return target;
  }

  /** Read a file as string. */
  readFile(filename: string): string {
    return readFileSync(this.safePath(filename), 'utf-8');
  }

  /** Read a file as Buffer. */
  readBuffer(filename: string): Buffer {
    return readFileSync(this.safePath(filename));
  }

  /** Write content to a file. Creates parent dirs if needed. */
  writeFile(filename: string, data: Buffer | string): void {
    const target = this.safePath(filename);
    const dir = resolve(target, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(target, data, typeof data === 'string' ? 'utf-8' : undefined);
  }

  /** Delete a file. Returns true if deleted. */
  deleteFile(filename: string): boolean {
    const target = this.safePath(filename);
    if (!existsSync(target)) return false;
    unlinkSync(target);
    return true;
  }

  /** Check if a file exists. */
  fileExists(filename: string): boolean {
    return existsSync(this.safePath(filename));
  }

  /** List all files in the module's directory (non-recursive). */
  listFiles(): string[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir).filter((f) => {
      const stat = statSync(join(this.dir, f));
      return stat.isFile();
    });
  }

  /** Get the absolute path to the module's directory. */
  getDir(): string {
    return this.dir;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private mergeWithDefaults(
    stored: Record<string, unknown>,
    defaults: Record<string, unknown>,
    schema: ConfigSchema,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...stored };

    for (const [key, field] of Object.entries(schema)) {
      if (!(key in result)) {
        result[key] = field.default ?? this.getDefaultForType(field.type);
      } else {
        const value = result[key];
        if (!this.isValidType(value, field.type)) {
          LitLogger.warn('Data', `Invalid type for ${key}, using default`);
          result[key] = field.default ?? this.getDefaultForType(field.type);
        }
      }
    }

    return result;
  }

  private getDefaultForType(type: string): unknown {
    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'json': return {};
      default: return null;
    }
  }

  private isValidType(value: unknown, type: string): boolean {
    if (value === null || value === undefined) return true;
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'json': return typeof value === 'object';
      default: return true;
    }
  }
}

// ── Config Definition Helper ──────────────────────────────────────────────────

export function defineConfig<T extends Record<string, unknown>>(config: {
  schema: ConfigSchema;
  defaults: T;
}): ModuleConfig<T> {
  return {
    schema: config.schema,
    defaults: config.defaults,
  };
}
