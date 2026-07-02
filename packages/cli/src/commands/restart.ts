import type { Command } from '../command.ts';
import { spawnBot, stopBot, isRunning } from '../fs.ts';

export const restartCommand: Command = {
  name: 'restart',
  description: 'Restart the bot',
  usage: 'biscotto restart [entry]',
  async run(ctx) {
    if (isRunning(ctx.root)) {
      console.log('  Stopping bot...');
      await stopBot(ctx.root);
    }

    const entry = ctx.args[0] ?? 'src/index.ts';

    try {
      const child = spawnBot(ctx.root, entry);
      console.log(`  Biscotto restarted (PID: ${child.pid})`);
    } catch (error) {
      console.error(`  Error: ${error}`);
      process.exit(1);
    }
  },
};
