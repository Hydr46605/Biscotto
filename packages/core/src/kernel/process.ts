import { readFileSync, writeFileSync, unlinkSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawn as spawnChild, type ChildProcess } from 'node:child_process';
import { LitLogger } from './logger.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const BISCUITTO_DIR = resolve(process.cwd(), '.biscotto');
const PID_FILE = resolve(BISCUITTO_DIR, 'biscotto.pid');
const LOG_FILE = resolve(BISCUITTO_DIR, 'biscotto.log');
const STOP_TIMEOUT_MS = 5_000;

// ── ProcessManager ────────────────────────────────────────────────────────────

export class ProcessManager {
  /**
   * Check if a process with the given PID is alive.
   */
  static isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read the PID from the PID file.
   * Returns null if no file or invalid content.
   */
  static getPid(): number | null {
    if (!existsSync(PID_FILE)) return null;

    try {
      const raw = readFileSync(PID_FILE, 'utf-8').trim();
      const pid = Number(raw);
      if (Number.isNaN(pid) || pid <= 0) return null;
      return pid;
    } catch {
      return null;
    }
  }

  /**
   * Check if the bot is currently running.
   */
  static isRunning(): boolean {
    const pid = this.getPid();
    if (pid === null) return false;
    return this.isAlive(pid);
  }

  /**
   * Write the PID to the PID file.
   */
  static writePid(pid: number): void {
    this.ensureDir();
    writeFileSync(PID_FILE, String(pid), 'utf-8');
  }

  /**
   * Remove the PID file.
   */
  static removePid(): void {
    if (existsSync(PID_FILE)) {
      try { unlinkSync(PID_FILE); } catch {}
    }
  }

  /**
   * Spawn the bot as a detached child process.
   * Returns the child process reference.
   */
  static spawn(entry: string = 'src/index.ts'): ChildProcess {
    if (this.isRunning()) {
      const pid = this.getPid();
      throw new Error(`Bot is already running (PID: ${pid})`);
    }

    this.ensureDir();

    // Determine command: use tsx for .ts files, node for .js
    const isTs = entry.endsWith('.ts');

    let child: ChildProcess;
    if (process.platform === 'win32') {
      const cmdStr = isTs ? `npx tsx "${entry}"` : `node "${entry}"`;
      child = spawnChild(cmdStr, {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
        shell: true,
      });
    } else {
      const cmd = isTs ? 'npx' : 'node';
      const args = isTs ? ['tsx', entry] : [entry];
      child = spawnChild(cmd, args, {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
      });
    }

    if (!child.pid) {
      throw new Error('Failed to spawn bot process');
    }

    this.writePid(child.pid);

    // Detach so it survives parent exit
    child.unref();

    return child;
  }

  /**
   * Stop the running bot gracefully.
   * Sends SIGTERM, then SIGKILL after timeout.
   */
  static stop(): boolean {
    const pid = this.getPid();
    if (pid === null) return false;

    if (!this.isAlive(pid)) {
      this.removePid();
      return false;
    }

    // Send SIGTERM
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      this.removePid();
      return false;
    }

    // Wait for process to exit, then force kill
    const start = Date.now();
    while (Date.now() - start < STOP_TIMEOUT_MS) {
      if (!this.isAlive(pid)) {
        this.removePid();
        return true;
      }
    }

    // Force kill
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('node:child_process') as typeof import('node:child_process');
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {}

    this.removePid();
    return true;
  }

  /**
   * Get current status information.
   */
  static status(): { running: boolean; pid: number | null; uptime: number | null } {
    const pid = this.getPid();
    const running = pid !== null && this.isAlive(pid);
    return { running, pid, uptime: null };
  }

  /**
   * Append a line to the log file.
   */
  static log(message: string): void {
    this.ensureDir();
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf-8');
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private static ensureDir(): void {
    if (!existsSync(BISCUITTO_DIR)) {
      mkdirSync(BISCUITTO_DIR, { recursive: true });
    }
  }
}
