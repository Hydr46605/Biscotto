/**
 * Shared test fixtures for Biscotto core tests.
 *
 * Avoid importing `packages/core/src/index.ts` directly: that file auto-runs
 * the bot at module load time. Always import from deep paths.
 */
import type {
  BiscottoModule,
  ModuleManifest,
} from '../../packages/core/src/contracts/module.contract.ts';
import type { StorageProvider } from '../../packages/core/src/kernel/storage/types.ts';

// ── Mock Manifest Builder ─────────────────────────────────────────────────────

export function makeManifest(
  name: string,
  version = '1.0.0',
  extras: Partial<ModuleManifest> = {},
): ModuleManifest {
  return {
    name,
    version,
    description: `Mock module ${name}`,
    tags: [],
    author: { name: 'Tester' },
    license: 'MIT',
    ...extras,
  };
}

// ── Mock Module Builder ───────────────────────────────────────────────────────

export function makeModule(
  manifest: ModuleManifest,
  overrides: Partial<BiscottoModule> = {},
): BiscottoModule {
  return {
    manifest,
    register: () => ({
      commands: [],
      buttons: [],
      selectMenus: [],
      modals: [],
      autocompletes: [],
      userContextMenus: [],
      messageContextMenus: [],
      events: [],
    }),
    ...overrides,
  };
}

// ── In-memory Storage Provider ────────────────────────────────────────────────

export class InMemoryStorage implements StorageProvider {
  readonly driver = 'json' as const;
  private map = new Map<string, unknown>();

  async init(): Promise<void> {}
  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.map.get(key) as T) ?? null;
  }
  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }
  async has(key: string): Promise<boolean> {
    return this.map.has(key);
  }
  async all<T = unknown>(): Promise<Map<string, T>> {
    const out = new Map<string, T>();
    for (const [k, v] of this.map) out.set(k, v as T);
    return out;
  }
  async clear(): Promise<void> {
    this.map.clear();
  }
  async close(): Promise<void> {}
}
