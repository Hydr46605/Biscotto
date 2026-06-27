import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { LitLogger } from './logger.ts';

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

// ── Config Manager ────────────────────────────────────────────────────────────

export class ConfigManager {
  private configsDir: string;
  private cache = new Map<string, Record<string, unknown>>();

  constructor(root: string) {
    this.configsDir = resolve(root, '.biscotto', 'configs');
    if (!existsSync(this.configsDir)) {
      mkdirSync(this.configsDir, { recursive: true });
    }
  }

  /**
   * Load config for a module. Creates default config if not exists.
   */
  load<T extends Record<string, unknown>>(
    moduleName: string,
    schema: ConfigSchema,
    defaults: T,
  ): T {
    // Check cache
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName) as T;
    }

    const configPath = this.getConfigPath(moduleName);

    if (!existsSync(configPath)) {
      // Create default config
      this.save(moduleName, defaults);
      this.cache.set(moduleName, defaults);
      LitLogger.debug('Config', `Created default config for ${moduleName}`);
      return defaults;
    }

    // Load existing config
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const stored = JSON.parse(raw) as Record<string, unknown>;

      // Merge with defaults (add missing keys, keep existing values)
      const merged = this.mergeWithDefaults(stored, defaults, schema);

      // Save if we added new keys
      if (JSON.stringify(merged) !== JSON.stringify(stored)) {
        this.save(moduleName, merged);
        LitLogger.debug('Config', `Updated config for ${moduleName} with new defaults`);
      }

      this.cache.set(moduleName, merged);
      return merged as T;
    } catch (error) {
      LitLogger.error('Config', `Failed to load config for ${moduleName}: ${error}`);
      this.cache.set(moduleName, defaults);
      return defaults;
    }
  }

  /**
   * Save config for a module.
   */
  save(moduleName: string, config: Record<string, unknown>): void {
    const configPath = this.getConfigPath(moduleName);
    const dir = resolve(this.configsDir);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.cache.set(moduleName, config);
  }

  /**
   * Get a specific config value.
   */
  get<T>(moduleName: string, key: string): T | undefined {
    const config = this.cache.get(moduleName);
    if (!config) return undefined;
    return config[key] as T;
  }

  /**
   * Set a specific config value.
   */
  set(moduleName: string, key: string, value: unknown): void {
    const config = this.cache.get(moduleName) ?? {};
    config[key] = value;
    this.save(moduleName, config);
  }

  /**
   * Check if a config file exists.
   */
  has(moduleName: string): boolean {
    return existsSync(this.getConfigPath(moduleName));
  }

  /**
   * Delete a config file.
   */
  delete(moduleName: string): boolean {
    const configPath = this.getConfigPath(moduleName);
    if (existsSync(configPath)) {
      const { unlinkSync } = require('node:fs');
      unlinkSync(configPath);
      this.cache.delete(moduleName);
      return true;
    }
    return false;
  }

  /**
   * Get all config keys for a module.
   */
  keys(moduleName: string): string[] {
    const config = this.cache.get(moduleName);
    return config ? Object.keys(config) : [];
  }

  /**
   * Clear cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private getConfigPath(moduleName: string): string {
    return join(this.configsDir, `${moduleName}.json`);
  }

  private mergeWithDefaults(
    stored: Record<string, unknown>,
    defaults: Record<string, unknown>,
    schema: ConfigSchema,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...stored };

    for (const [key, field] of Object.entries(schema)) {
      if (!(key in result)) {
        // Add missing key with default
        result[key] = field.default ?? this.getDefaultForType(field.type);
      } else {
        // Validate existing value
        const value = result[key];
        if (!this.isValidType(value, field.type)) {
          LitLogger.warn('Config', `Invalid type for ${key}, using default`);
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
    if (value === null || value === undefined) return true; // null/undefined uses default
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
