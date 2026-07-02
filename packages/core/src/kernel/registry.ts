import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { LitLogger } from './logger.ts';

// ── Types (canonical) ─────────────────────────────────────────────────────────

/**
 * A single installed-module record. Both the core loader and the CLI
 * (re-exported via `cli/src/fs.ts`) consume this shape. `enabled` defaults
 * to true; `false` indicates the user disabled the module via
 * `biscotto disable` and the loader will skip it on startup.
 */
export interface InstalledModule {
  readonly source: string;
  readonly version: string;
  readonly installedAt: string;
  readonly builtAt?: string;
  readonly enabled?: boolean;
}

export interface InstalledFile {
  readonly version: number;
  readonly modules: Record<string, InstalledModule>;
}

// ── Registry ──────────────────────────────────────────────────────────────────

const FILE_NAME = 'installed.json';
const SCHEMA_VERSION = 1;

export class InstalledRegistry {
  private data: InstalledFile;
  private readonly filePath: string;

  constructor(biscottoDir: string) {
    this.filePath = resolve(biscottoDir, FILE_NAME);
    this.data = this.load();
  }

  all(): Record<string, InstalledModule> {
    return { ...this.data.modules };
  }

  get(name: string): InstalledModule | undefined {
    return this.data.modules[name];
  }

  has(name: string): boolean {
    return name in this.data.modules;
  }

  add(name: string, entry: InstalledModule): void {
    this.data = {
      ...this.data,
      modules: {
        ...this.data.modules,
        [name]: entry,
      },
    };
    this.save();
    LitLogger.debug('Registry', `Registered module: ${name}@${entry.version}`);
  }

  remove(name: string): boolean {
    if (!(name in this.data.modules)) return false;

    const { [name]: _, ...rest } = this.data.modules;
    this.data = { ...this.data, modules: rest };
    this.save();
    LitLogger.debug('Registry', `Unregistered module: ${name}`);
    return true;
  }

  markBuilt(name: string): void {
    const mod = this.data.modules[name];
    if (!mod) return;

    this.data = {
      ...this.data,
      modules: {
        ...this.data.modules,
        [name]: { ...mod, builtAt: new Date().toISOString() },
      },
    };
    this.save();
  }

  setEnabled(name: string, enabled: boolean): boolean {
    const mod = this.data.modules[name];
    if (!mod) return false;
    this.data = {
      ...this.data,
      modules: {
        ...this.data.modules,
        [name]: { ...mod, enabled },
      },
    };
    this.save();
    return true;
  }

  names(): string[] {
    return Object.keys(this.data.modules);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private load(): InstalledFile {
    if (!existsSync(this.filePath)) {
      return { version: SCHEMA_VERSION, modules: {} };
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as InstalledFile;

      if (parsed.version !== SCHEMA_VERSION) {
        LitLogger.warn('Registry', `Unknown schema version ${parsed.version}, starting fresh`);
        return { version: SCHEMA_VERSION, modules: {} };
      }

      return parsed;
    } catch (error) {
      LitLogger.error('Registry', `Failed to read ${this.filePath}: ${error}`);
      return { version: SCHEMA_VERSION, modules: {} };
    }
  }

  private save(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      LitLogger.error('Registry', `Failed to write ${this.filePath}: ${error}`);
    }
  }
}
