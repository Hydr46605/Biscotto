import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistry } from '../../packages/core/src/kernel/services.ts';

describe('ServiceRegistry', () => {
  let reg: ServiceRegistry;

  beforeEach(() => {
    reg = new ServiceRegistry();
  });

  it('exposes a provided service through require()', () => {
    const api = { greet: () => 'hi' };
    reg.provide('greet', api, 'modA');
    expect(reg.require<typeof api>('greet').greet()).toBe('hi');
  });

  it('throws when a service is provided twice', () => {
    reg.provide('x', {}, 'modA');
    expect(() => reg.provide('x', {}, 'modB')).toThrow(/already provided/);
  });

  it('throws when require() is called for unknown service', () => {
    expect(() => reg.require('nope')).toThrow(/not found/);
  });

  it('has() returns true for provided, false otherwise', () => {
    reg.provide('a', {}, 'modA');
    expect(reg.has('a')).toBe(true);
    expect(reg.has('b')).toBe(false);
  });

  it('info() and list() provide accurate metadata', () => {
    reg.provide('a', () => 1, 'modA');
    const info = reg.info('a');
    expect(info).toEqual({ name: 'a', provider: 'modA', type: 'function' });
    const list = reg.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('a');
  });

  it('removeByProvider drops only that provider\u2019s services', () => {
    reg.provide('a', {}, 'modX');
    reg.provide('b', {}, 'modY');
    expect(reg.removeByProvider('modX')).toEqual(['a']);
    expect(reg.has('a')).toBe(false);
    expect(reg.has('b')).toBe(true);
  });

  it('clear() removes everything', () => {
    reg.provide('a', {}, 'modX');
    reg.provide('b', {}, 'modY');
    reg.clear();
    expect(reg.list()).toEqual([]);
  });
});
