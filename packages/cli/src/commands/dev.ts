import type { Command } from '../command.ts';
import { spawn, type ChildProcess } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import { resolve } from 'node:path';
import { modulesDir, isRunning } from '../fs.ts';

let botProcess: ChildProcess | null = null;
let watcher: FSWatcher | null = null;
let restartTimeout: ReturnType<typeof setTimeout> | null = null;

function killBot(): Promise<void> {
  return new Promise((resolve) => {
    if (!botProcess) { resolve(); return; }

    botProcess.on('exit', () => {
      botProcess = null;
      resolve();
    });

    botProcess.kill('SIGTERM');

    setTimeout(() => {
      if (botProcess) {
        botProcess.kill('SIGKILL');
        botProcess = null;
      }
      resolve();
    }, 3000);
  });
}

function startBot(root: string, entry: string): ChildProcess {
  const isTs = entry.endsWith('.ts');
  const cmd = isTs ? 'npx' : 'node';
  const args = isTs ? ['tsx', 'watch', entry] : ['--watch', entry];

  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    ...(process.platform === 'win32' ? { shell: true } : {}),
  });

  child.on('error', (err) => {
    console.error(`  Bot error: ${err.message}`);
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`  Bot exited with code ${code}`);
    }
    botProcess = null;
  });

  return child;
}

function scheduleRestart(root: string, entry: string): void {
  if (restartTimeout) clearTimeout(restartTimeout);
  restartTimeout = setTimeout(async () => {
    console.log('\n  Reloading modules...');
    await killBot();
    botProcess = startBot(root, entry);
  }, 300);
}

export const devCommand: Command = {
  name: 'dev',
  description: 'Start bot with hot reload',
  usage: 'biscotto dev [entry]',
  async run(ctx) {
    if (isRunning(ctx.root)) {
      console.error('  Error: bot is already running');
      console.error('  Use "biscotto stop" first');
      process.exit(1);
    }

    const entry = ctx.args[0] ?? 'src/index.ts';
    const watchDir = modulesDir(ctx.root);

    console.log('  Starting Biscotto in dev mode...');
    console.log(`  Watching: ${watchDir}`);

    botProcess = startBot(ctx.root, entry);

    try {
      watcher = watch(watchDir, { recursive: true }, (event, filename) => {
        if (!filename) return;
        console.log(`  Change detected: ${filename}`);
        scheduleRestart(ctx.root, entry);
      });
    } catch (err) {
      console.log(`  Warning: could not watch modules directory: ${err}`);
    }

    const shutdown = async () => {
      console.log('\n  Shutting down...');
      if (watcher) { watcher.close(); watcher = null; }
      if (restartTimeout) { clearTimeout(restartTimeout); restartTimeout = null; }
      await killBot();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  },
};
