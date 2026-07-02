import { describe, it, expect } from 'vitest';
import {
  resolveDependencies,
  checkDependencies,
  checkVersionConstraints,
  checkServiceRequirements,
  DependencyError,
  satisfiesRange,
} from '../../packages/core/src/kernel/resolver.ts';
import { makeManifest } from './_setup.ts';

// ── Semver Range Satisfaction ─────────────────────────────────────────────────

describe('satisfiesRange', () => {
  it('* matches everything', () => {
    expect(satisfiesRange('0.1.0', '*')).toBe(true);
    expect(satisfiesRange('99.99.99', '*')).toBe(true);
  });

  it('exact match', () => {
    expect(satisfiesRange('1.0.0', '1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.0', '1.0.1')).toBe(false);
  });

  it('^ caret range', () => {
    expect(satisfiesRange('1.0.0', '^1.0.0')).toBe(true);
    expect(satisfiesRange('1.5.3', '^1.0.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
    expect(satisfiesRange('0.9.0', '^1.0.0')).toBe(false);
  });

  it('~ tilde range', () => {
    expect(satisfiesRange('1.0.0', '~1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.9', '~1.0.0')).toBe(true);
    expect(satisfiesRange('1.1.0', '~1.0.0')).toBe(false);
    expect(satisfiesRange('1.2.0', '~1.1.0')).toBe(false);
  });

  it('>= > <= < relational ranges', () => {
    expect(satisfiesRange('1.0.0', '>=1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.0', '>=1.0.1')).toBe(false);
    expect(satisfiesRange('1.5.0', '>1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.0', '<2.0.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '<=1.5.0')).toBe(false);
  });

  it('pre-release tag is NOT >= final release', () => {
    // 1.0.0-beta is a pre-release of 1.0.0, so it should NOT satisfy ^1.0.0
    // (semver: pre-release < final in same MAJ.MIN.PATCH). The matcher
    // previously had this as a bug where pre-release flag was discarded.
    expect(satisfiesRange('1.0.0-beta', '^1.0.0')).toBe(false);
    expect(satisfiesRange('1.0.0-beta', '>=1.0.0')).toBe(false);
  });

  it('equal pre-release matches equal pre-release', () => {
    expect(satisfiesRange('1.0.0-beta.1', '1.0.0-beta.1')).toBe(true);
    expect(satisfiesRange('1.0.0-beta.2', '1.0.0-beta.1')).toBe(false);
  });
});

// ── Dependency Resolution ─────────────────────────────────────────────────────

describe('resolveDependencies', () => {
  it('returns modules in topological order with no dependencies first', () => {
    const a = { manifest: makeManifest('a'), path: '/a' };
    const b = {
      manifest: makeManifest('b', '1.0.0', { dependencies: { a: '^1.0.0' } }),
      path: '/b',
    };
    const c = {
      manifest: makeManifest('c', '1.0.0', { dependencies: { b: '^1.0.0' } }),
      path: '/c',
    };
    const result = resolveDependencies([c, a, b]);
    const names = result.map((m) => m.manifest.name);
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
  });

  it('throws on missing dependency', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { dependencies: { missing: '^1.0.0' } }),
      path: '/a',
    };
    expect(() => resolveDependencies([a])).toThrow(DependencyError);
  });

  it('throws on circular dependency', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { dependencies: { b: '^1.0.0' } }),
      path: '/a',
    };
    const b = {
      manifest: makeManifest('b', '1.0.0', { dependencies: { a: '^1.0.0' } }),
      path: '/b',
    };
    expect(() => resolveDependencies([a, b])).toThrow(DependencyError);
  });

  it('treats builtin names as always available', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { dependencies: { zero: '^1.0.0' } }),
      path: '/a',
    };
    const result = resolveDependencies([a], new Set(['zero']));
    expect(result).toHaveLength(1);
  });
});

// ── checkDependencies / checkServiceRequirements ─────────────────────────────

describe('checkDependencies', () => {
  it('reports missing deps', () => {
    const manifest = makeManifest('a', '1.0.0', { dependencies: { x: '^1.0.0' } });
    expect(checkDependencies(manifest, new Set())).toEqual(['x']);
  });

  it('passes when all deps are present', () => {
    const manifest = makeManifest('a', '1.0.0', { dependencies: { x: '^1.0.0' } });
    expect(checkDependencies(manifest, new Set(['x']))).toEqual([]);
  });
});

describe('checkVersionConstraints', () => {
  it('reports version mismatches', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { dependencies: { b: '^2.0.0' } }),
      path: '/a',
    };
    const b = { manifest: makeManifest('b', '1.5.0'), path: '/b' };
    const issues = checkVersionConstraints([a, b]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      module: 'a',
      dependency: 'b',
      expected: '^2.0.0',
      actual: '1.5.0',
    });
  });
});

describe('checkServiceRequirements', () => {
  it('passes when every required service is provided', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { provides: ['x'] }),
      path: '/a',
    };
    const b = {
      manifest: makeManifest('b', '1.0.0', { requires: ['x'] }),
      path: '/b',
    };
    expect(checkServiceRequirements([a, b])).toEqual([]);
  });

  it('reports missing services', () => {
    const a = {
      manifest: makeManifest('a', '1.0.0', { requires: ['x'] }),
      path: '/a',
    };
    const issues = checkServiceRequirements([a]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ module: 'a', missing: ['x'] });
  });
});
