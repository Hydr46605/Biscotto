import { describe, it, expect } from 'vitest';
import {
  validateManifest,
  loadManifest,
  ManifestError,
} from '../../packages/core/src/kernel/validation.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validateManifest', () => {
  it('accepts minimal valid manifest', () => {
    const result = validateManifest({ name: 'a-mod', version: '1.0.0' });
    expect(result.name).toBe('a-mod');
    expect(result.version).toBe('1.0.0');
  });

  it('rejects missing name', () => {
    expect(() => validateManifest({ version: '1.0.0' })).toThrow(ManifestError);
  });

  it('rejects invalid name format', () => {
    expect(() => validateManifest({ name: 'BadName', version: '1.0.0' })).toThrow(/lowercase/);
    expect(() => validateManifest({ name: 'mod_name', version: '1.0.0' })).toThrow(/lowercase/);
    expect(() => validateManifest({ name: '1-mod', version: '1.0.0' })).toThrow(/lowercase/);
  });

  it('rejects invalid semver', () => {
    expect(() => validateManifest({ name: 'a', version: 'not-semver' })).toThrow(/semver/);
    expect(() => validateManifest({ name: 'a', version: '1.0' })).toThrow(/semver/);
  });

  it('accepts pre-release semver', () => {
    const m = validateManifest({ name: 'a', version: '1.0.0-beta.1' });
    expect(m.version).toBe('1.0.0-beta.1');
  });

  it('validates optional peerDependencies when present', () => {
    const m = validateManifest({
      name: 'a',
      version: '1.0.0',
      peerDependencies: { core: '^1.0.0', other: '2.0.0' },
    });
    expect(m.peerDependencies).toEqual({ core: '^1.0.0', other: '2.0.0' });
  });

  it('rejects invalid peerDependencies shape', () => {
    expect(() =>
      validateManifest({ name: 'a', version: '1.0.0', peerDependencies: 'not-a-record' }),
    ).toThrow(/peerDependencies/);
    expect(() =>
      validateManifest({
        name: 'a',
        version: '1.0.0',
        peerDependencies: { core: 'not-a-range' },
      }),
    ).toThrow(/peerDependencies\.core/);
  });

  it('accepts requires/provides arrays of strings', () => {
    const m = validateManifest({
      name: 'a',
      version: '1.0.0',
      requires: ['x', 'y'],
      provides: ['x'],
    });
    expect(m.requires).toEqual(['x', 'y']);
    expect(m.provides).toEqual(['x']);
  });

  it('rejects requires that is not a string array', () => {
    expect(() =>
      validateManifest({ name: 'a', version: '1.0.0', requires: ['x', 1] }),
    ).toThrow(/requires/);
  });

  it('validates storage.driver when present', () => {
    expect(() =>
      validateManifest({
        name: 'a',
        version: '1.0.0',
        storage: { driver: 'redis' },
      }),
    ).toThrow(/storage\.driver/);

    const m = validateManifest({
      name: 'a',
      version: '1.0.0',
      storage: { driver: 'sqlite' },
    });
    expect(m.storage?.driver).toBe('sqlite');
  });
});

describe('loadManifest', () => {
  it('parses biscotto.json from disk', () => {
    const dir = join(tmpdir(), `biscotto-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'biscotto.json'), JSON.stringify({
      name: 'disc', version: '1.2.3', license: 'MIT',
    }));
    const m = loadManifest(dir);
    expect(m.name).toBe('disc');
    expect(m.version).toBe('1.2.3');
    expect(m.license).toBe('MIT');
  });
});
