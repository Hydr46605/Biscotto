import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';

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
  const cmd = isTs ? 'npx' : 'node';
  const args = isTs ? ['tsx', entry] : [entry];

  const child = spawn(cmd, args, {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    ...(process.platform === 'win32' ? { shell: true } : {}),
  });

  if (!child.pid) throw new Error('Failed to spawn bot process');

  writePid(root, child.pid);
  child.unref();
  return child;
}

export function stopBot(root: string): boolean {
  const pid = getPid(root);
  if (pid === null) return false;
  if (!isAlive(pid)) { removePid(root); return false; }

  try { process.kill(pid, 'SIGTERM'); } catch { removePid(root); return false; }

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) { removePid(root); return true; }
  }

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

// ── Logging ───────────────────────────────────────────────────────────────────

export function log(root: string, message: string): void {
  ensureBiscottoDir(root);
  const ts = new Date().toISOString();
  appendFileSync(logFile(root), `[${ts}] ${message}\n`, 'utf-8');
}
