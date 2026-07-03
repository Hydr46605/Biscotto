import type {
  RowDataPacket,
  ResultSetHeader,
  Pool,
} from 'mysql2/promise';
import type { StorageProvider, MysqlConfig } from '../types.js';
import { LitLogger } from '../../logger.js';

const log = LitLogger.child('Storage:MySQL');

/**
 * Shared MySQL pool — all modules share one connection pool.
 * Created once during bootstrap, passed to every SharedMysqlProvider
 * owned by a module.
 */
export class SharedMysqlPool {
  private pool: Pool | null = null;

  constructor(private readonly config: MysqlConfig) {}

  async init(): Promise<void> {
    if (this.pool) return;
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
    log.debug('Shared pool initialized');
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized. Call init() first.');
    }
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }
}

type ValueRow = RowDataPacket & { value: string };
type KeyValueRow = RowDataPacket & { key: string; value: string };
type CountRow = RowDataPacket & { count: number };

function assertValueRow(row: RowDataPacket | undefined): string | null {
  if (!row || typeof (row as ValueRow).value !== 'string') return null;
  return (row as ValueRow).value;
}

/**
 * MysqlProvider that uses the shared pool.
 *
 * One table per module: `<ModuleName>_store`.
 *
 * Uses `pool.query()` exclusively \u2014 mysql2/promise exposes only
 * `query` and `execute`, NOT `exec`. (The prior implementation called
 * the non-existent `pool.exec(...)`, crashing on first `init()`.)
 */
export class SharedMysqlProvider implements StorageProvider {
  readonly driver = 'mysql' as const;
  private readonly tableName: string;
  private initialized = false;

  constructor(
    private readonly pool: SharedMysqlPool,
    moduleName: string,
  ) {
    this.tableName = `${moduleName}_store`;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const p = this.pool.getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value LONGTEXT NOT NULL
      )
    `);
    const [rows] = await p.query(
      `SELECT COUNT(*) AS count FROM \`${this.tableName}\``,
    ) as [CountRow[], unknown];
    log.debug(`Initialized table ${this.tableName} (${rows[0]?.count ?? 0} rows)`);
    this.initialized = true;
  }

  private requireReady(): void {
    if (!this.initialized) {
      throw new Error(`SharedMysqlProvider (${this.tableName}) not initialized; call init() first.`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.requireReady();
    const [rows] = await this.pool.getPool().query(
      `SELECT value FROM \`${this.tableName}\` WHERE \`key\` = ?`,
      [key],
    ) as [RowDataPacket[], unknown];
    const value = assertValueRow(rows[0]);
    return value === null ? null : (JSON.parse(value) as T);
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.requireReady();
    await this.pool.getPool().query(
      `INSERT INTO \`${this.tableName}\` (\`key\`, value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<boolean> {
    this.requireReady();
    const [result] = await this.pool.getPool().query(
      `DELETE FROM \`${this.tableName}\` WHERE \`key\` = ?`,
      [key],
    ) as [ResultSetHeader, unknown];
    return result.affectedRows > 0;
  }

  async has(key: string): Promise<boolean> {
    this.requireReady();
    const [rows] = await this.pool.getPool().query(
      `SELECT 1 AS present FROM \`${this.tableName}\` WHERE \`key\` = ?`,
      [key],
    ) as [RowDataPacket[], unknown];
    return rows.length > 0;
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    this.requireReady();
    const [rows] = await this.pool.getPool().query(
      `SELECT \`key\`, value FROM \`${this.tableName}\``,
    ) as [KeyValueRow[], unknown];
    const map = new Map<string, T>();
    for (const row of rows) {
      map.set(row.key, JSON.parse(row.value) as T);
    }
    return map;
  }

  async clear(): Promise<void> {
    this.requireReady();
    await this.pool.getPool().query(`DELETE FROM \`${this.tableName}\``);
  }

  async close(): Promise<void> {
    // Pool is shared across modules; do not `end()` it here.
    this.initialized = false;
  }
}
