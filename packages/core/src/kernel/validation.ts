import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  ModuleManifest,
  ModuleAuthor,
} from '../contracts/module.contract.js';
import type { StorageDriver } from './storage/types.js';

// ── Errors ────────────────────────────────────────────────────────────────────

export class ManifestError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`Invalid manifest: ${field} — ${message}`);
    this.name = 'ManifestError';
  }
}

// ── Regex Constants ───────────────────────────────────────────────────────────

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;
const SEMVER_RANGE_RE = /^(\*|(>=|<=|>|<|~|\^)?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)$/;
const STORAGE_DRIVERS: StorageDriver[] = ['json', 'sqlite', 'yaml', 'mysql'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function required(obj: Record<string, unknown>, key: string): void {
  if (obj[key] === undefined || obj[key] === null) {
    throw new ManifestError(key, 'is required');
  }
}

function isString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((v) => typeof v === 'string' && v.length > 0);
}

function validateSemverRecord(
  obj: Record<string, unknown>,
  key: string,
): Record<string, string> {
  if (!isRecord(obj[key])) {
    throw new ManifestError(key, 'must be an object { "<dep>": "<range>" }');
  }
  const out: Record<string, string> = {};
  for (const [dep, range] of Object.entries(obj[key])) {
    if (!isString(range)) {
      throw new ManifestError(`${key}.${dep}`, 'must be a non-empty semver range string');
    }
    if (!SEMVER_RANGE_RE.test(range)) {
      throw new ManifestError(`${key}.${dep}`, `must be a semver range (got "${range}")`);
    }
    out[dep] = range;
  }
  return out;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a raw JSON object as a ModuleManifest.
 *
 * v1.9.0 changes: also validates newly-supported optional fields
 * (`peerDependencies`, `requires`, `provides`, `storage`). The validator
 * remains lenient: missing new fields are still accepted. Only present-but-
 * malformed fields are rejected with a `ManifestError`.
 */
export function validateManifest(data: unknown): ModuleManifest {
  if (!isRecord(data)) {
    throw new ManifestError('root', 'must be a JSON object');
  }

  // ── Required ────────────────────────────────────────────────────────────
  required(data, 'name');
  if (!isString(data.name)) {
    throw new ManifestError('name', 'must be a non-empty string');
  }
  if (!NAME_RE.test(data.name)) {
    throw new ManifestError('name', 'must be lowercase alphanumeric with hyphens (e.g. "my-module")');
  }

  required(data, 'version');
  if (!isString(data.version)) {
    throw new ManifestError('version', 'must be a non-empty string');
  }
  if (!SEMVER_RE.test(data.version)) {
    throw new ManifestError('version', 'must be valid semver (e.g. "1.0.0")');
  }

  // ── Optional strings ─────────────────────────────────────────────────────
  if (data.description !== undefined && !isString(data.description)) {
    throw new ManifestError('description', 'must be a string');
  }
  if (data.entry !== undefined && !isString(data.entry)) {
    throw new ManifestError('entry', 'must be a string');
  }
  if (data.build !== undefined && !isString(data.build)) {
    throw new ManifestError('build', 'must be a string');
  }
  if (data.repository !== undefined && !isString(data.repository)) {
    throw new ManifestError('repository', 'must be a string');
  }
  if (data.license !== undefined && !isString(data.license)) {
    throw new ManifestError('license', 'must be a string');
  }

  // ── Author ──────────────────────────────────────────────────────────────
  if (data.author !== undefined) {
    if (!isRecord(data.author)) {
      throw new ManifestError('author', 'must be an object { name, url? }');
    }
    if (!isString(data.author.name)) {
      throw new ManifestError('author.name', 'must be a non-empty string');
    }
    if (data.author.url !== undefined && !isString(data.author.url)) {
      throw new ManifestError('author.url', 'must be a string');
    }
  }

  // ── Engine ──────────────────────────────────────────────────────────────
  if (data.engine !== undefined) {
    if (!isString(data.engine)) {
      throw new ManifestError('engine', 'must be a string');
    }
    if (!SEMVER_RANGE_RE.test(data.engine)) {
      throw new ManifestError('engine', `must be a semver range (got "${data.engine}")`);
    }
  }

  // ── Dependency records ──────────────────────────────────────────────────
  let dependencies: Record<string, string> | undefined;
  if (data.dependencies !== undefined) {
    dependencies = validateSemverRecord(data, 'dependencies');
  }

  let peerDependencies: Record<string, string> | undefined;
  if (data.peerDependencies !== undefined) {
    peerDependencies = validateSemverRecord(data, 'peerDependencies');
  }

  // ── Tags array ──────────────────────────────────────────────────────────
  let tags: string[] | undefined;
  if (data.tags !== undefined) {
    if (!isStringArray(data.tags)) {
      throw new ManifestError('tags', 'must be an array of non-empty strings');
    }
    tags = data.tags;
  }

  // ── requires / provides arrays ──────────────────────────────────────────
  let requires: string[] | undefined;
  if (data.requires !== undefined) {
    if (!isStringArray(data.requires)) {
      throw new ManifestError('requires', 'must be an array of non-empty strings');
    }
    requires = data.requires;
  }

  let provides: string[] | undefined;
  if (data.provides !== undefined) {
    if (!isStringArray(data.provides)) {
      throw new ManifestError('provides', 'must be an array of non-empty strings');
    }
    provides = data.provides;
  }

  // ── storage ─────────────────────────────────────────────────────────────
  let storage: { driver: StorageDriver } | undefined;
  if (data.storage !== undefined) {
    if (!isRecord(data.storage)) {
      throw new ManifestError('storage', 'must be an object { driver }');
    }
    const driver = data.storage.driver;
    if (typeof driver !== 'string' || !STORAGE_DRIVERS.includes(driver as StorageDriver)) {
      throw new ManifestError(
        'storage.driver',
        `must be one of: ${STORAGE_DRIVERS.join(', ')} (got "${driver}")`,
      );
    }
    storage = { driver: driver as StorageDriver };
  }

  // ── Build the typed manifest ────────────────────────────────────────────
  const author: ModuleAuthor | undefined = isRecord(data.author)
    ? { name: data.author.name as string, url: data.author.url as string | undefined }
    : undefined;

  const manifest: ModuleManifest = {
    name: data.name,
    version: data.version,
    ...(isString(data.description) && { description: data.description }),
    ...(author && { author }),
    ...(isString(data.entry) && { entry: data.entry }),
    ...(isString(data.build) && { build: data.build }),
    ...(isString(data.engine) && { engine: data.engine }),
    ...(dependencies && { dependencies }),
    ...(peerDependencies && { peerDependencies }),
    ...(isString(data.repository) && { repository: data.repository }),
    ...(isString(data.license) && { license: data.license }),
    ...(tags && { tags }),
    ...(requires && { requires }),
    ...(provides && { provides }),
    ...(storage && { storage }),
  };

  return manifest;
}

/**
 * Load and validate a biscotto.json file from disk.
 */
export function loadManifest(dir: string): ModuleManifest {
  const filePath = resolve(dir, 'biscotto.json');
  const raw = readFileSync(filePath, 'utf-8');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ManifestError('root', `failed to parse ${filePath}`);
  }

  return validateManifest(json);
}
