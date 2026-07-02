import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, appendFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';

// ── Installed Modules ─────────────────────────────────────────────────────────────────
//
// `InstalledModule` / `InstalledFile` are defined canonically in
// `@biscotto/core` (`core/src/kernel/registry.ts`). The CLI re-declares
// the same fields here to keep runtime dependency-free; the layout must
// stay in lock-step with the core types.

export interface InstalledModule {
  source: string;
  version: string;
  installedAt: string;
  builtAt?: string;
  enabled?: boolean;
}

export interface InstalledFile {
  version: number;
  modules: Record<string, InstalledModule>;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

export function findRoot(start: string = process.cwd()): string {
  let dir = start;
  while (true) {
    if (existsSync(resolve(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

export function biscottoDir(root: string): string {
  return resolve(root, '.biscotto');
}

export function pidFile(root: string): string {
  return resolve(biscottoDir(root), 'biscotto.pid');
}

export function logFile(root: string): string {
  return resolve(biscottoDir(root), 'biscotto.log');
}

export function installedFile(root: string): string {
  return resolve(biscottoDir(root), 'installed.json');
}

export function modulesDir(root: string): string {
  return resolve(biscottoDir(root), 'modules');
}

export function reloadFlagFile(root: string): string {
  return resolve(biscottoDir(root), 'reload.json');
}

export function ensureBiscottoDir(root: string): void {
  const dir = biscottoDir(root);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const mods = modulesDir(root);
  if (!existsSync(mods)) mkdirSync(mods, { recursive: true });
}

// ── PID Management ────────────────────────────────────────────────────────────

export function getPid(root: string): number | null {
  const file = pidFile(root);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, 'utf-8').trim();
    const pid = Number(raw);
    return Number.isNaN(pid) || pid <= 0 ? null : pid;
  } catch {
    return null;
  }
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isRunning(root: string): boolean {
  const pid = getPid(root);
  return pid !== null && isAlive(pid);
}

export function writePid(root: string, pid: number): void {
  ensureBiscottoDir(root);
  writeFileSync(pidFile(root), String(pid), 'utf-8');
}

export function removePid(root: string): void {
  const file = pidFile(root);
  if (existsSync(file)) {
    try { unlinkSync(file); } catch {}
  }
}

// ── Process Control ───────────────────────────────────────────────────────────

export function spawnBot(root: string, entry: string = 'src/index.ts'): ChildProcess {
  if (isRunning(root)) {
    const pid = getPid(root);
    throw new Error(`Bot is already running (PID: ${pid})`);
  }

  ensureBiscottoDir(root);

  const isTs = entry.endsWith('.ts');

  let child: ChildProcess;
  if (process.platform === 'win32') {
    const cmdStr = isTs ? `npx tsx "${entry}"` : `node "${entry}"`;
    child = spawn(cmdStr, {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
  } else {
    const cmd = isTs ? 'npx' : 'node';
    const args = isTs ? ['tsx', entry] : [entry];
    child = spawn(cmd, args, {
      cwd: root,
      detached: true,
      stdio: 'ignore',
    });
  }

  if (!child.pid) throw new Error('Failed to spawn bot process');

  writePid(root, child.pid);
  child.unref();
  return child;
}

/**
 * Asynchronously waits for a process to exit, polling every 100 ms up to
 * `timeoutMs` milliseconds. Resolves true if exited, false on timeout.
 * Uses an interval-driven poll so the event loop remains responsive
 * (the previous implementation busy-looped on Date.now()).
 */
function awaitExit(pid: number, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolveFn) => {
    if (!isAlive(pid)) {
      resolveFn(true);
      return;
    }
    const timer = setInterval(() => {
      if (!isAlive(pid)) {
        clearInterval(timer);
        resolveFn(true);
      }
    }, 100);
    const guard = setTimeout(() => {
      clearInterval(timer);
      resolveFn(false);
    }, timeoutMs);
    // Allow the process to exit even if promises hang in unref environments
    timer.unref?.();
    guard.unref?.();
  });
}

/**
 * Stop the running bot gracefully: SIGTERM, wait up to 5 s, then SIGKILL
 * (Windows: `taskkill /T /F`).
 */
export async function stopBot(root: string, timeoutMs = 5_000): Promise<boolean> {
  const pid = getPid(root);
  if (pid === null) return false;
  if (!isAlive(pid)) {
    removePid(root);
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    removePid(root);
    return false;
  }

  const exited = await awaitExit(pid, timeoutMs);
  if (exited) {
    removePid(root);
    return true;
  }

  // Force kill after timeout.
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {}

  removePid(root);
  return true;
}

// ── Installed Modules ─────────────────────────────────────────────────────────

/**
 * Single source of truth for an installed module's record is defined in
 * `@biscotto/core` (`core/src/kernel/registry.ts`) and re-exported here.
 */

export function readInstalled(root: string): InstalledFile {
  const file = installedFile(root);
  if (!existsSync(file)) return { version: 1, modules: {} };
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as InstalledFile;
  } catch {
    return { version: 1, modules: {} };
  }
}

export function writeInstalled(root: string, data: InstalledFile): void {
  ensureBiscottoDir(root);
  writeFileSync(installedFile(root), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Atomic write-rename of a JSON payload to `path`. Cross-platform via
 * `node:fs#renameSync`, which uses `rename(2)` on POSIX and
 * `MoveFileEx(MOVEFILE_REPLACE_EXISTING)` on Windows \u2014 both are
 * atomic at the kernel level for same-volume moves. Avoids the
 * shell-escaping risks of shelling out to mv/move.
 */
export function writeAtomicJson(path: string, payload: unknown): void {
  ensureBiscottoDir(dirname(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
  renameSync(tmp, path);
}

// ── Logging ───────────────────────────────────────────────────────────────────

export function log(root: string, message: string): void {
  ensureBiscottoDir(root);
  const ts = new Date().toISOString();
  appendFileSync(logFile(root), `[${ts}] ${message}\n`, 'utf-8');
}
