import type { ModuleManifest } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

// ── Errors ────────────────────────────────────────────────────────────────────

export class DependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyError';
  }
}

// ── Version Matching ──────────────────────────────────────────────────────────

/**
 * Simple semver constraint matcher.
 * Supports: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, *
 */
function parseVersion(v: string): [number, number, number, string] {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.]+)?$/);
  if (!match) return [0, 0, 0, ''];
  return [
    parseInt(match[1]),
    parseInt(match[2]),
    parseInt(match[3]),
    match[4] ?? '',
  ];
}

function versionGte(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = parseVersion(a);
  const [bMaj, bMin, bPat] = parseVersion(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat >= bPat;
}

function satisfiesRange(version: string, range: string): boolean {
  if (range === '*') return true;

  // Exact match
  if (range === version) return true;

  // ^1.0.0 — compatible with 1.0.0 (>=1.0.0 <2.0.0)
  if (range.startsWith('^')) {
    const target = range.slice(1);
    const [tMaj] = parseVersion(target);
    const [vMaj] = parseVersion(version);
    return versionGte(version, target) && vMaj === tMaj;
  }

  // ~1.0.0 — approximately 1.0.0 (>=1.0.0 <1.1.0)
  if (range.startsWith('~')) {
    const target = range.slice(1);
    const [tMaj, tMin] = parseVersion(target);
    const [vMaj, vMin] = parseVersion(version);
    return versionGte(version, target) && vMaj === tMaj && vMin === tMin;
  }

  // >=1.0.0
  if (range.startsWith('>=')) {
    return versionGte(version, range.slice(2));
  }

  // >1.0.0
  if (range.startsWith('>')) {
    return versionGte(version, range.slice(1));
  }

  // <=1.0.0
  if (range.startsWith('<=')) {
    return !versionGte(version, range.slice(2)) || version === range.slice(2);
  }

  // <1.0.0
  if (range.startsWith('<')) {
    return !versionGte(version, range.slice(1));
  }

  // Exact match
  return version === range;
}

// ── Resolver ──────────────────────────────────────────────────────────────────

export interface ResolvedModule {
  readonly manifest: ModuleManifest;
  readonly path: string;
  readonly instance?: unknown;
}

export interface ResolvedGraph {
  readonly modules: ResolvedModule[];
  readonly loadOrder: string[];
  readonly provides: Map<string, string>;
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

/**
 * Check if the actual version of a dependency satisfies the constraint.
 */
export function checkVersionConstraints(
  modules: ResolvedModule[],
): { module: string; dependency: string; expected: string; actual: string }[] {
  const byName = new Map(modules.map((m) => [m.manifest.name, m]));
  const issues: { module: string; dependency: string; expected: string; actual: string }[] = [];

  for (const mod of modules) {
    const deps = mod.manifest.dependencies;
    if (!deps) continue;

    for (const [depName, range] of Object.entries(deps)) {
      const depMod = byName.get(depName);
      if (!depMod) continue; // Missing deps are caught elsewhere

      if (!satisfiesRange(depMod.manifest.version, range)) {
        issues.push({
          module: mod.manifest.name,
          dependency: depName,
          expected: range,
          actual: depMod.manifest.version,
        });
      }
    }
  }

  return issues;
}

/**
 * Build a full dependency graph with services info.
 */
export function buildDependencyGraph(
  modules: ResolvedModule[],
  builtinNames: Set<string> = new Set(),
): ResolvedGraph {
  const ordered = resolveDependencies(modules, builtinNames);

  const provides = new Map<string, string>();
  for (const mod of ordered) {
    if (mod.manifest.provides) {
      for (const service of mod.manifest.provides) {
        provides.set(service, mod.manifest.name);
      }
    }
  }

  return {
    modules: ordered,
    loadOrder: ordered.map((m) => m.manifest.name),
    provides,
  };
}

/**
 * Check if all required services are provided by some module.
 */
export function checkServiceRequirements(
  modules: ResolvedModule[],
  builtinNames: Set<string> = new Set(),
): { module: string; missing: string[] }[] {
  const byName = new Map(modules.map((m) => [m.manifest.name, m]));
  const allProvides = new Map<string, string>();

  // Collect all provided services
  for (const mod of modules) {
    if (mod.manifest.provides) {
      for (const service of mod.manifest.provides) {
        allProvides.set(service, mod.manifest.name);
      }
    }
  }

  // Also add builtin services
  for (const name of builtinNames) {
    allProvides.set(`builtin:${name}`, name);
  }

  const issues: { module: string; missing: string[] }[] = [];

  for (const mod of modules) {
    const requires = mod.manifest.requires;
    if (!requires) continue;

    const missing = requires.filter((s) => !allProvides.has(s));
    if (missing.length > 0) {
      issues.push({ module: mod.manifest.name, missing });
    }
  }

  return issues;
}
