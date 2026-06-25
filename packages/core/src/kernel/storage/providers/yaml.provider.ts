import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import yaml from 'js-yaml';
import type { StorageProvider } from '../types.ts';
import { LitLogger } from '../../logger.ts';

const log = LitLogger.child('Storage:YAML');

export class YamlProvider implements StorageProvider {
  readonly driver = 'yaml' as const;
  private data = new Map<string, unknown>();
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async init(): Promise<void> {
    const dir = dirname(this.path);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    if (existsSync(this.path)) {
      try {
        const raw = await readFile(this.path, 'utf-8');
        const parsed = yaml.load(raw) as Record<string, unknown> | null;
        if (parsed && typeof parsed === 'object') {
          this.data = new Map(Object.entries(parsed));
        }
        log.debug(`Loaded ${this.data.size} entries from ${this.path}`);
      } catch (error) {
        log.error(`Failed to parse ${this.path}: ${error}`);
        this.data = new Map();
      }
    } else {
      await this.flush();
      log.debug(`Created new store at ${this.path}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = this.data.get(key);
    return (value as T) ?? null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
    await this.flush();
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.data.delete(key);
    if (existed) await this.flush();
    return existed;
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    return new Map(this.data as Map<string, T>);
  }

  async clear(): Promise<void> {
    this.data.clear();
    await this.flush();
  }

  async close(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    const obj = Object.fromEntries(this.data);
    const content = yaml.dump(obj, { indent: 2, lineWidth: -1 });
    await writeFile(this.path, content, 'utf-8');
  }
}
