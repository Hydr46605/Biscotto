import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── ANSI ──────────────────────────────────────────────────────────────────────

const A = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',

  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  gray:    '\x1b[90m',
  bRed:    '\x1b[91m',
  bGreen:  '\x1b[92m',
  bYellow: '\x1b[93m',
  bCyan:   '\x1b[96m',
  bWhite:  '\x1b[97m',
} as const;

// ── Levels ────────────────────────────────────────────────────────────────────

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVELS: Record<LogLevel, { badge: string; color: string; pri: number }> = {
  trace: { badge: '\u250c', color: A.gray,    pri: 0 },
  debug: { badge: '\u2502', color: A.cyan,    pri: 1 },
  info:  { badge: '\u2714', color: A.bGreen,  pri: 2 },
  warn:  { badge: '\u26a0', color: A.bYellow, pri: 3 },
  error: { badge: '\u2716', color: A.bRed,    pri: 4 },
  fatal: { badge: '\u2620', color: A.red,     pri: 5 },
};

let minLevel: LogLevel = 'trace';

// ── Format ────────────────────────────────────────────────────────────────────

function ts(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

function fmt(level: LogLevel, scope: string, msg: string): string {
  const l = LEVELS[level];
  const badge = `${l.color}${A.bold}${l.badge}  ${level.toUpperCase().padEnd(5)}${A.reset}`;
  const sco = `${A.bCyan}${A.bold}${scope.padEnd(14)}${A.reset}`;
  return `${A.gray}${ts()}${A.reset}  ${badge}  ${sco} ${msg}`;
}

function plain(level: LogLevel, scope: string, msg: string): string {
  const l = LEVELS[level];
  return `${ts()}  ${l.badge}  ${level.toUpperCase().padEnd(5)}  ${scope.padEnd(14)} ${msg}`;
}

function emit(level: LogLevel, scope: string, msg: string, data?: unknown): void {
  if (LEVELS[level].pri < LEVELS[minLevel].pri) return;

  const line = fmt(level, scope, msg);
  const dest = level === 'error' || level === 'fatal' ? console.error : console.log;
  dest(line);

  if (data !== undefined) {
    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    for (const row of json.split('\n')) {
      dest(`${A.gray}${ts()}           ${A.reset}  ${row}`);
    }
  }

  // File
  try {
    const dir = resolve(process.cwd(), 'logs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const fileLine = plain(level, scope, msg) + '\n';
    appendFileSync(resolve(dir, `${date}.log`), fileLine);
  } catch {}
}

// ── Public ────────────────────────────────────────────────────────────────────

export const LitLogger = {
  trace: (s: string, m: string, d?: unknown) => emit('trace', s, m, d),
  debug: (s: string, m: string, d?: unknown) => emit('debug', s, m, d),
  info:  (s: string, m: string, d?: unknown) => emit('info',  s, m, d),
  warn:  (s: string, m: string, d?: unknown) => emit('warn',  s, m, d),
  error: (s: string, m: string, d?: unknown) => emit('error', s, m, d),
  fatal: (s: string, m: string, d?: unknown) => emit('fatal', s, m, d),

  setLevel(l: LogLevel): void { minLevel = l; },

  child(scope: string) {
    return {
      trace: (m: string, d?: unknown) => emit('trace', scope, m, d),
      debug: (m: string, d?: unknown) => emit('debug', scope, m, d),
      info:  (m: string, d?: unknown) => emit('info',  scope, m, d),
      warn:  (m: string, d?: unknown) => emit('warn',  scope, m, d),
      error: (m: string, d?: unknown) => emit('error', scope, m, d),
      fatal: (m: string, d?: unknown) => emit('fatal', scope, m, d),
    };
  },

  async measure<T>(scope: string, label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const ms = (performance.now() - start).toFixed(1);
      emit('info', scope, `${label} ${A.bGreen}done${A.reset} ${A.bold}${ms}ms${A.reset}`);
      return result;
    } catch (err) {
      const ms = (performance.now() - start).toFixed(1);
      emit('error', scope, `${label} ${A.bRed}failed${A.reset} ${A.bold}${ms}ms${A.reset}`);
      throw err;
    }
  },

  line(): void {
    console.log(`${A.gray}${'─'.repeat(60)}${A.reset}`);
  },

  banner(): void {
    const b = [
      '',
      `  ${A.bCyan}${A.bold}Hy${A.bRed}drotto${A.reset}`,
      `  ${A.gray}Modular Discord Bot${A.reset}`,
      '',
      `  ${A.dim}Node     ${A.reset} ${A.bWhite}${process.version}${A.reset}`,
      `  ${A.dim}Platform ${A.reset} ${A.bWhite}${process.platform} ${process.arch}${A.reset}`,
      `  ${A.dim}PID      ${A.reset} ${A.bWhite}${process.pid}${A.reset}`,
      '',
    ];
    console.log(b.join('\n'));
  },

  ready(tag: string, guilds: number, uptime: number): void {
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    LitLogger.line();
    emit('info', 'Ready', `${A.bold}${tag}${A.reset} is online`);
    emit('info', 'Ready', `Serving ${A.bold}${guilds}${A.reset} guild(s)`);
    emit('info', 'Ready', `Uptime: ${A.bold}${h}h ${m}m ${s}s${A.reset}`);
    LitLogger.line();
  },
};

export type { LogLevel };
