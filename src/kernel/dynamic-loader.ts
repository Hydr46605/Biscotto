import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Client } from 'discord.js';
import type { BiscottoModule, ModuleManifest } from '../contracts/module.contract.ts';
import { loadManifest, ManifestError } from './validation.ts';
import { resolveDependencies, checkDependencies, DependencyError, type ResolvedModule } from './resolver.ts';
import { LitLogger } from './logger.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoadResult {
  readonly modules: BiscottoModule[];
  readonly errors: LoadError[];
}

export interface LoadError {
  readonly name: string;
  readonly error: string;
}

// ── Dynamic Loader ────────────────────────────────────────────────────────────

const BUILTIN_NAMES = new Set(['zero']);

/**
 * Discover and load all modules from a directory.
 * Each subdirectory must contain a valid biscotto.json.
 */
export function discoverModules(modulesDir: string): ResolvedModule[] {
  if (!existsSync(modulesDir)) {
    LitLogger.debug('DynLoader', `Modules directory not found: ${modulesDir}`);
    return [];
  }

  const entries = readdirSync(modulesDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const discovered: ResolvedModule[] = [];
  const errors: string[] = [];

  for (const dir of dirs) {
    const dirPath = resolve(modulesDir, dir.name);
    const manifestPath = resolve(dirPath, 'biscotto.json');

    if (!existsSync(manifestPath)) {
      LitLogger.warn('DynLoader', `Skipping ${dir.name}: no biscotto.json`);
      continue;
    }

    try {
      const manifest = loadManifest(dirPath);
      discovered.push({ manifest, path: dirPath });
    } catch (error) {
      if (error instanceof ManifestError) {
        errors.push(`${dir.name}: ${error.message}`);
        LitLogger.error('DynLoader', `Invalid manifest in ${dir.name}: ${error.message}`);
      } else {
        errors.push(`${dir.name}: ${error}`);
        LitLogger.error('DynLoader', `Failed to load manifest from ${dir.name}: ${error}`);
      }
    }
  }

  if (errors.length > 0) {
    LitLogger.warn('DynLoader', `${errors.length} module(s) had manifest errors`);
  }

  return discovered;
}

/**
 * Resolve dependencies and load all discovered modules.
 * Returns successfully loaded modules and any errors encountered.
 */
export async function loadFromDisk(
  modulesDir: string,
  builtinModules: BiscottoModule[],
): Promise<LoadResult> {
  const discovered = discoverModules(modulesDir);

  if (discovered.length === 0) {
    LitLogger.info('DynLoader', 'No external modules found');
    return { modules: [], errors: [] };
  }

  // Check dependencies before resolving
  const available = new Set([
    ...builtinModules.map((m) => m.manifest.name),
    ...discovered.map((m) => m.manifest.name),
  ]);

  const validModules: ResolvedModule[] = [];
  const errors: LoadError[] = [];

  for (const mod of discovered) {
    const missing = checkDependencies(mod.manifest, available, BUILTIN_NAMES);
    if (missing.length > 0) {
      const msg = `Missing dependencies: ${missing.join(', ')}`;
      errors.push({ name: mod.manifest.name, error: msg });
      LitLogger.error('DynLoader', `${mod.manifest.name}: ${msg}`);
      continue;
    }
    validModules.push(mod);
  }

  // Topological sort
  let ordered: ResolvedModule[];
  try {
    ordered = resolveDependencies(validModules, BUILTIN_NAMES);
  } catch (error) {
    if (error instanceof DependencyError) {
      LitLogger.error('DynLoader', `Dependency resolution failed: ${error.message}`);
      return { modules: [], errors: [...errors, { name: 'resolver', error: error.message }] };
    }
    throw error;
  }

  // Dynamically import each module
  const loaded: BiscottoModule[] = [];

  for (const mod of ordered) {
    try {
      const modulePath = resolve(mod.path, mod.manifest.entry ?? 'dist/index.js');
      const imported = await import(modulePath);

      // The module should export a default BiscottoModule or a named export
      const biscottoMod: BiscottoModule | undefined =
        imported.default ?? imported[`${mod.manifest.name}Module`] ?? imported.module;

      if (!biscottoMod) {
        throw new Error(`No BiscottoModule export found in ${modulePath}`);
      }

      loaded.push(biscottoMod);
      LitLogger.debug('DynLoader', `Loaded: ${biscottoMod.manifest.name}@${biscottoMod.manifest.version}`);
    } catch (error) {
      errors.push({ name: mod.manifest.name, error: String(error) });
      LitLogger.error('DynLoader', `Failed to load ${mod.manifest.name}: ${error}`);
    }
  }

  LitLogger.info('DynLoader', `Loaded ${loaded.length} external module(s)`);
  return { modules: loaded, errors };
}
