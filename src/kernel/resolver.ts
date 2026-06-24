import type { ModuleManifest } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

// ── Errors ────────────────────────────────────────────────────────────────────

export class DependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyError';
  }
}

// ── Resolver ──────────────────────────────────────────────────────────────────

export interface ResolvedModule {
  readonly manifest: ModuleManifest;
  readonly path: string;
}

/**
 * Topological sort of modules based on their dependencies.
 * Modules with no dependencies come first.
 * Throws DependencyError on missing or circular dependencies.
 */
export function resolveDependencies(
  modules: ResolvedModule[],
  builtinNames: Set<string> = new Set(),
): ResolvedModule[] {
  const byName = new Map(modules.map((m) => [m.manifest.name, m]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: ResolvedModule[] = [];

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (builtinNames.has(name)) return;

    const mod = byName.get(name);
    if (!mod) {
      throw new DependencyError(`Module "${name}" is required but not installed`);
    }

    if (visiting.has(name)) {
      throw new DependencyError(`Circular dependency detected: ${name}`);
    }

    visiting.add(name);

    const deps = mod.manifest.dependencies;
    if (deps) {
      for (const depName of Object.keys(deps)) {
        visit(depName);
      }
    }

    visiting.delete(name);
    visited.add(name);
    result.push(mod);
  }

  for (const mod of modules) {
    visit(mod.manifest.name);
  }

  LitLogger.debug('Resolver', `Resolved ${result.length} module(s) in load order`);
  return result;
}

/**
 * Check if all dependencies of a module are satisfiable.
 * Returns a list of missing dependency names, or empty if all satisfied.
 */
export function checkDependencies(
  manifest: ModuleManifest,
  available: Set<string>,
  builtinNames: Set<string> = new Set(),
): string[] {
  if (!manifest.dependencies) return [];

  const missing: string[] = [];
  for (const depName of Object.keys(manifest.dependencies)) {
    if (!available.has(depName) && !builtinNames.has(depName)) {
      missing.push(depName);
    }
  }
  return missing;
}
