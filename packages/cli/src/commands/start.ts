import type { Command } from '../command.ts';
import { spawnBot, isRunning } from '../fs.ts';

export const startCommand: Command = {
  name: 'start',
  description: 'Start the bot in background',
  usage: 'biscotto start [entry]',
  async run(ctx) {
    if (isRunning(ctx.root)) {
      console.error('  Error: bot is already running');
      console.error('  Use "biscotto stop" first, or "biscotto restart"');
      process.exit(1);
    }

    const entry = ctx.args[0] ?? 'src/index.ts';

    try {
      const child = spawnBot(ctx.root, entry);
      console.log(`  Biscotto started (PID: ${child.pid})`);
    } catch (error) {
      console.error(`  Error: ${error}`);
      process.exit(1);
    }
  },
};
