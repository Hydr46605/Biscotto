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

const LEVELS: Record<LogLevel, { icon: string; color: string; label: string; pri: number }> = {
  trace: { icon: '-', color: A.gray,    label: 'TRACE', pri: 0 },
  debug: { icon: '>', color: A.cyan,    label: 'DEBUG', pri: 1 },
  info:  { icon: '+', color: A.bGreen,  label: 'INFO ', pri: 2 },
  warn:  { icon: '!', color: A.bYellow, label: 'WARN ', pri: 3 },
  error: { icon: 'x', color: A.bRed,    label: 'ERROR', pri: 4 },
  fatal: { icon: 'X', color: A.red,     label: 'FATAL', pri: 5 },
};

const SCOPE_WIDTH = 16;
const LEVEL_WIDTH = 10; // icon(1) + space(1) + label(5) + space(1) = 8, but we pad to 10 for alignment

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

/**
 * Format a log line with strict column alignment:
 *
 *   HH:MM:SS,ms  +  INFO   [Scope]         Message
 *   HH:MM:SS,ms  >  DEBUG  [Scope]            Message
 *   HH:MM:SS,ms  -  TRACE  [Scope]            Message
 */
function fmt(level: LogLevel, scope: string, msg: string): string {
  const l = LEVELS[level];
  const badge = `${l.color}${A.bold}${l.icon}${A.reset}`;
  const label = `${l.color}${A.bold}${l.label}${A.reset}`;
  const sco = `${A.bCyan}${A.bold}[${scope}]${A.reset}`;
  // Pad scope to fixed width (visible chars only)
  const pad = Math.max(0, SCOPE_WIDTH - scope.length - 2); // -2 for brackets
  const paddedSco = sco + ' '.repeat(pad);
  return `${A.gray}${ts()}${A.reset}  ${badge}  ${label}  ${paddedSco} ${msg}`;
}

/**
 * Plain (no ANSI) version for file logging.
 */
function plain(level: LogLevel, scope: string, msg: string): string {
  const l = LEVELS[level];
  const sco = `[${scope}]`.padEnd(SCOPE_WIDTH + 2);
  return `${ts()}  ${l.icon}  ${l.label}  ${sco} ${msg}`;
}

/**
 * Indented line (for tree-style, details, sub-items).
 * Aligns with the message column of the main format.
 */
function indent(level: LogLevel, scope: string, tree: string, msg: string): string {
  const l = LEVELS[level];
  const badge = `${l.color}${A.bold}${l.icon}${A.reset}`;
  const label = `${l.color}${A.bold}${l.label}${A.reset}`;
  const sco = `${A.bCyan}${A.bold}[${scope}]${A.reset}`;
  const pad = Math.max(0, SCOPE_WIDTH - scope.length - 2);
  const paddedSco = sco + ' '.repeat(pad);
  return `${A.gray}${ts()}${A.reset}  ${badge}  ${label}  ${paddedSco} ${A.gray}${tree}${A.reset} ${msg}`;
}

function emit(level: LogLevel, scope: string, msg: string, data?: unknown): void {
  if (LEVELS[level].pri < LEVELS[minLevel].pri) return;

  console.log(fmt(level, scope, msg));

  if (data !== undefined) {
    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const pad = ' '.repeat(12 + 2 + LEVEL_WIDTH + 2 + SCOPE_WIDTH + 2);
    for (const row of json.split('\n')) {
      console.log(`${A.gray}${pad}${row}${A.reset}`);
    }
  }

  // File logging
  try {
    const dir = resolve(process.cwd(), 'logs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    appendFileSync(resolve(dir, `${date}.log`), plain(level, scope, msg) + '\n');
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

  /**
   * Tree-style log line. Aligns with the message column.
   *
   *   02:28:33,210  +  INFO   [Loader]           |- moduleName v1.0.0
   *   02:28:33,211  >  DEBUG  [Loader]           |  Commands: cmd1, cmd2
   */
  tree(scope: string, connector: string, msg: string, level: LogLevel = 'info'): void {
    console.log(indent(level, scope, connector, msg));
  },

  async measure<T>(scope: string, label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const ms = (performance.now() - start).toFixed(1);
      emit('info', scope, `${label} ${A.bGreen}done${A.reset} in ${A.bold}${ms}ms${A.reset}`);
      return result;
    } catch (err) {
      const ms = (performance.now() - start).toFixed(1);
      emit('error', scope, `${label} ${A.bRed}failed${A.reset} after ${A.bold}${ms}ms${A.reset}`);
      throw err;
    }
  },

  line(): void {
    // Full width line matching the log format
    const width = 12 + 2 + LEVEL_WIDTH + 2 + SCOPE_WIDTH + 2 + 40; // ts + gap + level + gap + scope + gap + msg
    console.log(`${A.gray}${'-'.repeat(width)}${A.reset}`);
  },

  banner(): void {
    const b = [
      '',
      `  ${A.bCyan}${A.bold}Bi${A.bYellow}scotto${A.reset}`,
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
