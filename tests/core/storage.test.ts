import { describe, it, expect, afterAll } from 'vitest';
import { JsonProvider } from '../../packages/core/src/kernel/storage/providers/json.provider.ts';
import { YamlProvider } from '../../packages/core/src/kernel/storage/providers/yaml.provider.ts';
import { SqliteProvider } from '../../packages/core/src/kernel/storage/providers/sqlite.provider.ts';
import { SharedMysqlProvider, SharedMysqlPool } from '../../packages/core/src/kernel/storage/providers/mysql.provider.ts';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync, mkdirSync } from 'node:fs';

function tempPath(ext: string): string {
  const base = join(tmpdir(), `biscotto-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return join(base, `store.${ext}`);
}

describe('JsonProvider', () => {
  it('round-trips entries', async () => {
    const p = new JsonProvider(tempPath('json'));
    await p.init();
    await p.set('a', 1);
    await p.set('b', { nested: true });
    expect(await p.get('a')).toBe(1);
    expect(await p.get<{ nested: boolean }>('b')).toEqual({ nested: true });
    expect(await p.has('a')).toBe(true);
    expect(await p.all()).toEqual(new Map([['a', 1], ['b', { nested: true }]]));
    await p.close();
  });

  it('delete returns true only when key exists', async () => {
    const p = new JsonProvider(tempPath('json'));
    await p.init();
    await p.set('a', 1);
    expect(await p.delete('a')).toBe(true);
    expect(await p.delete('a')).toBe(false);
    await p.close();
  });

  it('reload preserves data', async () => {
    const path = tempPath('json');
    const p1 = new JsonProvider(path);
    await p1.init();
    await p1.set('persistent', 'value');
    await p1.close();

    const p2 = new JsonProvider(path);
    await p2.init();
    expect(await p2.get('persistent')).toBe('value');
    await p2.close();
  });
});

describe('YamlProvider', () => {
  it('round-trips entries', async () => {
    const p = new YamlProvider(tempPath('yaml'));
    await p.init();
    await p.set('key', { kind: 'yaml', n: 7 });
    expect(await p.get<{ kind: string; n: number }>('key')).toEqual({ kind: 'yaml', n: 7 });
    await p.close();
  });
});

describe('SqliteProvider', () => {
  it('round-trips entries', async () => {
    const p = new SqliteProvider(tempPath('db'));
    await p.init();
    await p.set('a', 1);
    await p.set('b', { list: [1, 2, 3] });
    expect(await p.get('a')).toBe(1);
    expect(await p.get<{ list: number[] }>('b')).toEqual({ list: [1, 2, 3] });
    expect(await p.has('b')).toBe(true);
    await p.delete('a');
    expect(await p.has('a')).toBe(false);
    await p.close();
  });
});

describe('SharedMysqlProvider', () => {
  const url = process.env.MYSQL_TEST_URL;
  const skip = !url;

  it.skipIf(skip)('init() succeeds and queries with pool.query, not pool.exec', async () => {
    // Bugs we are fixing here: pool.exec does not exist on mysql2/promise.
    const cfg = {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'biscotto_test',
    };
    const pool = new SharedMysqlPool(cfg);
    await pool.init();
    const provider = new SharedMysqlProvider(pool, 'biscotto_test_module');
    await provider.init();
    await provider.set('hello', { world: true });
    expect(await provider.get('hello')).toEqual({ world: true });
    await provider.close();
    await pool.close();
  });
});

afterAll(() => {
  // temp paths auto-cleaned by OS; nothing to do.
});
