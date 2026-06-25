import type { StorageProvider, StorageConfig } from '../types.ts';
import { LitLogger } from '../../logger.ts';

const log = LitLogger.child('Storage:MySQL');

export class MysqlProvider implements StorageProvider {
  readonly driver = 'mysql' as const;
  private pool: any = null;
  private readonly config: NonNullable<StorageConfig['mysql']>;

  constructor(config: NonNullable<StorageConfig['mysql']>) {
    this.config = config;
  }

  async init(): Promise<void> {
    try {
      const mysql = await import('mysql2/promise');
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 5,
      });

      await this.pool.exec(`
        CREATE TABLE IF NOT EXISTS store (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value LONGTEXT NOT NULL
        )
      `);

      const [rows] = await this.pool.query('SELECT COUNT(*) as count FROM store') as any[];
      log.debug(`Loaded ${rows[0].count} entries from MySQL`);
    } catch (error) {
      log.error(`Failed to initialize MySQL: ${error}`);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const [rows] = await this.pool.query('SELECT value FROM store WHERE `key` = ?', [key]) as any[];
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value) as T;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.pool.query(
      'INSERT INTO store (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<boolean> {
    const [result] = await this.pool.query('DELETE FROM store WHERE `key` = ?', [key]) as any[];
    return result.affectedRows > 0;
  }

  async has(key: string): Promise<boolean> {
    const [rows] = await this.pool.query('SELECT 1 FROM store WHERE `key` = ?', [key]) as any[];
    return rows.length > 0;
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    const [rows] = await this.pool.query('SELECT `key`, value FROM store') as any[];
    const map = new Map<string, T>();
    for (const row of rows) {
      map.set(row.key, JSON.parse(row.value) as T);
    }
    return map;
  }

  async clear(): Promise<void> {
    await this.pool.query('DELETE FROM store');
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }
}
