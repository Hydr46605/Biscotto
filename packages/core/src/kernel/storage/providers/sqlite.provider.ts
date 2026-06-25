import type Storage from 'better-sqlite3';
import type { StorageProvider } from '../types.ts';
import { LitLogger } from '../../logger.ts';

const log = LitLogger.child('Storage:SQLite');

export class SqliteProvider implements StorageProvider {
  readonly driver = 'sqlite' as const;
  private db: Storage.Database | null = null;
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async init(): Promise<void> {
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.path);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      const count = this.db.prepare('SELECT COUNT(*) as count FROM store').get() as { count: number };
      log.debug(`Loaded ${count.count} entries from ${this.path}`);
    } catch (error) {
      log.error(`Failed to initialize SQLite: ${error}`);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const row = this.db!.prepare('SELECT value FROM store WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.value) as T;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.db!.prepare('INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<boolean> {
    const result = this.db!.prepare('DELETE FROM store WHERE key = ?').run(key);
    return result.changes > 0;
  }

  async has(key: string): Promise<boolean> {
    const row = this.db!.prepare('SELECT 1 FROM store WHERE key = ?').get(key);
    return row !== undefined;
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    const rows = this.db!.prepare('SELECT key, value FROM store').all() as { key: string; value: string }[];
    const map = new Map<string, T>();
    for (const row of rows) {
      map.set(row.key, JSON.parse(row.value) as T);
    }
    return map;
  }

  async clear(): Promise<void> {
    this.db!.exec('DELETE FROM store');
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}
