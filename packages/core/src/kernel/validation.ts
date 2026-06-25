import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ModuleManifest, ModuleAuthor } from '../contracts/module.contract.ts';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const SEMVER_RANGE_RE = /^(>=|<=|>|<|~|\^)?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

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
  return Array.isArray(val) && val.every((v) => typeof v === 'string');
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a raw JSON object as a ModuleManifest.
 * Throws ManifestError on invalid fields.
 */
export function validateManifest(data: unknown): ModuleManifest {
  if (!isRecord(data)) {
    throw new ManifestError('root', 'must be a JSON object');
  }

  // name: required, lowercase alphanumeric + hyphens
  required(data, 'name');
  if (!isString(data.name)) {
    throw new ManifestError('name', 'must be a non-empty string');
  }
  if (!NAME_RE.test(data.name)) {
    throw new ManifestError('name', 'must be lowercase alphanumeric with hyphens (e.g. "my-module")');
  }

  // version: required, valid semver
  required(data, 'version');
  if (!isString(data.version)) {
    throw new ManifestError('version', 'must be a non-empty string');
  }
  if (!SEMVER_RE.test(data.version)) {
    throw new ManifestError('version', 'must be valid semver (e.g. "1.0.0")');
  }

  // description: optional string
  if (data.description !== undefined && !isString(data.description)) {
    throw new ManifestError('description', 'must be a string');
  }

  // author: optional { name, url? }
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

  // entry: optional string, default "dist/index.js"
  if (data.entry !== undefined && !isString(data.entry)) {
    throw new ManifestError('entry', 'must be a string');
  }

  // build: optional string (shell command)
  if (data.build !== undefined && !isString(data.build)) {
    throw new ManifestError('build', 'must be a string');
  }

  // engine: optional semver range
  if (data.engine !== undefined) {
    if (!isString(data.engine)) {
      throw new ManifestError('engine', 'must be a string');
    }
    if (!SEMVER_RANGE_RE.test(data.engine)) {
      throw new ManifestError('engine', 'must be a semver range (e.g. ">=1.0.0")');
    }
  }

  // dependencies: optional Record<string, string>
  if (data.dependencies !== undefined) {
    if (!isRecord(data.dependencies)) {
      throw new ManifestError('dependencies', 'must be an object { "module": "version" }');
    }
    for (const [key, val] of Object.entries(data.dependencies)) {
      if (!isString(val)) {
        throw new ManifestError(`dependencies.${key}`, 'must be a semver range string');
      }
    }
  }

  // repository: optional string (URL)
  if (data.repository !== undefined && !isString(data.repository)) {
    throw new ManifestError('repository', 'must be a string');
  }

  // license: optional string
  if (data.license !== undefined && !isString(data.license)) {
    throw new ManifestError('license', 'must be a string');
  }

  // tags: optional string[]
  if (data.tags !== undefined && !isStringArray(data.tags)) {
    throw new ManifestError('tags', 'must be an array of strings');
  }

  // Build the typed manifest
  const manifest: ModuleManifest = {
    name: data.name,
    version: data.version,
    ...(isString(data.description) && { description: data.description }),
    ...(isRecord(data.author) && {
      author: { name: data.author.name as string, url: data.author.url as string | undefined },
    }),
    ...(isString(data.entry) && { entry: data.entry }),
    ...(isString(data.build) && { build: data.build }),
    ...(isString(data.engine) && { engine: data.engine }),
    ...(isRecord(data.dependencies) && { dependencies: data.dependencies as Record<string, string> }),
    ...(isString(data.repository) && { repository: data.repository }),
    ...(isString(data.license) && { license: data.license }),
    ...(isStringArray(data.tags) && { tags: data.tags }),
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
