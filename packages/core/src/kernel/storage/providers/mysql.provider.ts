import type { StorageProvider, MysqlConfig } from '../types.ts';
import { LitLogger } from '../../logger.ts';

const log = LitLogger.child('Storage:MySQL');

export class MysqlProvider implements StorageProvider {
  readonly driver = 'mysql' as const;
  private pool: any = null;
  private readonly tableName: string;
  private readonly config: MysqlConfig;

  constructor(config: MysqlConfig, moduleName: string) {
    this.config = config;
    this.tableName = `${moduleName}_store`;
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
        CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value LONGTEXT NOT NULL
        )
      `);

      const [rows] = await this.pool.query(`SELECT COUNT(*) as count FROM \`${this.tableName}\``) as any[];
      log.debug(`Loaded ${rows[0].count} entries from MySQL (${this.tableName})`);
    } catch (error) {
      log.error(`Failed to initialize MySQL: ${error}`);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const [rows] = await this.pool.query(`SELECT value FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value) as T;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.pool.query(
      `INSERT INTO \`${this.tableName}\` (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<boolean> {
    const [result] = await this.pool.query(`DELETE FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    return result.affectedRows > 0;
  }

  async has(key: string): Promise<boolean> {
    const [rows] = await this.pool.query(`SELECT 1 FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    return rows.length > 0;
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    const [rows] = await this.pool.query(`SELECT \`key\`, value FROM \`${this.tableName}\``) as any[];
    const map = new Map<string, T>();
    for (const row of rows) {
      map.set(row.key, JSON.parse(row.value) as T);
    }
    return map;
  }

  async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM \`${this.tableName}\``);
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }
}

/**
 * Shared MySQL pool — all modules share one connection pool.
 * Created once, passed to all MysqlProvider instances.
 */
export class SharedMysqlPool {
  private pool: any = null;

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
    LitLogger.debug('Storage:MySQL', 'Shared pool initialized');
  }

  getPool(): any {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }
}

/**
 * MysqlProvider variant that uses a shared pool.
 */
export class SharedMysqlProvider implements StorageProvider {
  readonly driver = 'mysql' as const;
  private readonly tableName: string;

  constructor(
    private readonly pool: SharedMysqlPool,
    moduleName: string,
  ) {
    this.tableName = `${moduleName}_store`;
  }

  async init(): Promise<void> {
    const p = this.pool.getPool();
    await p.exec(`
      CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value LONGTEXT NOT NULL
      )
    `);
    const [rows] = await p.query(`SELECT COUNT(*) as count FROM \`${this.tableName}\``) as any[];
    LitLogger.debug('Storage:MySQL', `Loaded ${rows[0].count} entries (${this.tableName})`);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const [rows] = await this.pool.getPool().query(`SELECT value FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value) as T;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.pool.getPool().query(
      `INSERT INTO \`${this.tableName}\` (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<boolean> {
    const [result] = await this.pool.getPool().query(`DELETE FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    return result.affectedRows > 0;
  }

  async has(key: string): Promise<boolean> {
    const [rows] = await this.pool.getPool().query(`SELECT 1 FROM \`${this.tableName}\` WHERE \`key\` = ?`, [key]) as any[];
    return rows.length > 0;
  }

  async all<T = unknown>(): Promise<Map<string, T>> {
    const [rows] = await this.pool.getPool().query(`SELECT \`key\`, value FROM \`${this.tableName}\``) as any[];
    const map = new Map<string, T>();
    for (const row of rows) {
      map.set(row.key, JSON.parse(row.value) as T);
    }
    return map;
  }

  async clear(): Promise<void> {
    await this.pool.getPool().query(`DELETE FROM \`${this.tableName}\``);
  }

  async close(): Promise<void> {
    // Shared pool — don't close it, just clear the table reference
  }
}
