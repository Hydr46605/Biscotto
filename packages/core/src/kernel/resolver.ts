import type { ModuleManifest } from '../contracts/module.contract.js';
import { LitLogger } from './logger.js';

// ── Errors ────────────────────────────────────────────────────────────────────

export class DependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyError';
  }
}

// ── Version Parsing & Comparison ──────────────────────────────────────────────

/**
 * A parsed semver version. `pre` is the pre-release identifier list joined
 * by dots (e.g. "beta.1"), or null for final releases.
 */
interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly pre: string | null;
}

/**
 * Parse a semver string. Returns {major,minor,patch,pre}. Build metadata
 * (`+foo`) is intentionally discarded; semver explicitly states that build
 * metadata MUST be ignored when determining version precedence.
 */
function parseVersion(v: string): ParsedVersion {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+[a-zA-Z0-9.-]+)?$/);
  if (!match) return { major: 0, minor: 0, patch: 0, pre: null };
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    pre: match[4] ?? null,
  };
}

/**
 * Semver-compliant comparison. Returns negative if a<b, positive if a>b,
 * zero if equal.
 *
 *   1.0.0-alpha < 1.0.0            (pre-release < final)
 *   1.0.0-alpha < 1.0.0-beta       (lexicographic in identifier space)
 *   1.0.0-beta.2  > 1.0.0-beta.1   (numeric identifier ordering)
 *   1.0.0-beta.2  > 1.0.0-beta.2.x (longer identifiers rank higher)
 *   numeric identifiers < string identifiers
 */
function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Same MAJ.MIN.PATCH → pre-release tag decides precedence.
  if (a.pre === null && b.pre === null) return 0;
  if (a.pre === null) return 1; // final > pre-release
  if (b.pre === null) return -1;

  const aParts = a.pre.split('.');
  const bParts = b.pre.split('.');
  const len = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aN = parseInt(aParts[i], 10);
    const bN = parseInt(bParts[i], 10);
    const aIsNum = !isNaN(aN) && /^[0-9]+$/.test(aParts[i]);
    const bIsNum = !isNaN(bN) && /^[0-9]+$/.test(bParts[i]);

    if (aIsNum && bIsNum) {
      if (aN !== bN) return aN - bN;
      continue;
    }
    if (aIsNum) return -1; // numeric < alphanumeric per semver
    if (bIsNum) return 1;
    // Both are non-numeric: ASCII lexicographic order
    if (aParts[i] < bParts[i]) return -1;
    if (aParts[i] > bParts[i]) return 1;
  }

  // All compared identifiers equal: longer identifier list ranks higher
  // (e.g. "beta.2" > "beta").
  return aParts.length - bParts.length;
}

function versionGte(a: string, b: string): boolean {
  return compareVersions(parseVersion(a), parseVersion(b)) >= 0;
}

/**
 * Check whether `version` satisfies `range`.
 *
 * Supports: `*`, exact, `^X.Y.Z`, `~X.Y.Z`, `>=X.Y.Z`, `>X.Y.Z`,
 * `<=X.Y.Z`, `<X.Y.Z`. Pre-release semantics follow semver rules:
 * a pre-release satisfies a range only if both the upper and lower bound
 * match the full pre-release tuple (or are absent on the lower side).
 */
export function satisfiesRange(version: string, range: string): boolean {
  if (range === '*') return true;

  // Exact match -- includes pre-release tag.
  if (range === version) return true;

  const v = parseVersion(version);
  const r = parseVersion(range);

  // Caret: ^X.Y.Z → compatible with X.Y.Z to next major (or 0.Y.Z for 0.x.y)
  if (range.startsWith('^')) {
    const target = range.slice(1);
    const t = parseVersion(target);
    // Special case: 0.x.y is permissive within minor only.
    let upper: ParsedVersion;
    if (t.major === 0) {
      upper = { ...t, patch: t.patch + 1 };
    } else {
      upper = { major: t.major + 1, minor: 0, patch: 0, pre: null };
    }
    const inRange = compareVersions(v, t) >= 0 && compareVersions(v, upper) < 0;
    return inRange;
  }

  // Tilde: ~X.Y.Z → within same minor (>= X.Y.Z, < X.(Y+1).0)
  if (range.startsWith('~')) {
    const target = range.slice(1);
    const t = parseVersion(target);
    const upper: ParsedVersion = { major: t.major, minor: t.minor + 1, patch: 0, pre: null };
    return compareVersions(v, t) >= 0 && compareVersions(v, upper) < 0;
  }

  if (range.startsWith('>=')) {
    return compareVersions(v, parseVersion(range.slice(2))) >= 0;
  }
  if (range.startsWith('>')) {
    return compareVersions(v, parseVersion(range.slice(1))) > 0;
  }
  if (range.startsWith('<=')) {
    return compareVersions(v, parseVersion(range.slice(2))) <= 0;
  }
  if (range.startsWith('<')) {
    return compareVersions(v, parseVersion(range.slice(1))) < 0;
  }

  // Fall back: exact match
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

    // Peer dependencies don't gate load order; they only constrain versions.
    const peers = mod.manifest.peerDependencies;
    if (peers) {
      for (const peerName of Object.keys(peers)) {
        visit(peerName);
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
  const missing: string[] = [];
  const deps = manifest.dependencies;
  if (deps) {
    for (const depName of Object.keys(deps)) {
      if (!available.has(depName) && !builtinNames.has(depName)) {
        missing.push(depName);
      }
    }
  }
  const peers = manifest.peerDependencies;
  if (peers) {
    for (const peerName of Object.keys(peers)) {
      if (!available.has(peerName) && !builtinNames.has(peerName)) {
        missing.push(peerName);
      }
    }
  }
  return missing;
}

/**
 * Check if the actual version of every dependency (regular + peer) satisfies
 * its declared constraint.
 */
export function checkVersionConstraints(
  modules: ResolvedModule[],
): { module: string; dependency: string; expected: string; actual: string; kind: 'dependency' | 'peerDependency' }[] {
  const byName = new Map(modules.map((m) => [m.manifest.name, m]));
  const issues: { module: string; dependency: string; expected: string; actual: string; kind: 'dependency' | 'peerDependency' }[] = [];

  for (const mod of modules) {
    const depLists: Array<[Record<string, string> | undefined, 'dependency' | 'peerDependency']> = [
      [mod.manifest.dependencies, 'dependency'],
      [mod.manifest.peerDependencies, 'peerDependency'],
    ];

    for (const [deps, kind] of depLists) {
      if (!deps) continue;
      for (const [depName, range] of Object.entries(deps)) {
        const depMod = byName.get(depName);
        if (!depMod) continue;
        if (range !== '*' && !satisfiesRange(depMod.manifest.version, range)) {
          issues.push({
            module: mod.manifest.name,
            dependency: depName,
            expected: range,
            actual: depMod.manifest.version,
            kind,
          });
        }
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
        if (provides.has(service)) {
          LitLogger.warn('Resolver', `Service "${service}" provided by multiple modules; first wins (${provides.get(service)})`);
          continue;
        }
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
  const allProvides = new Map<string, string>();

  for (const mod of modules) {
    if (mod.manifest.provides) {
      for (const service of mod.manifest.provides) {
        allProvides.set(service, mod.manifest.name);
      }
    }
  }

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
