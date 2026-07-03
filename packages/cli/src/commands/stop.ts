import type { Command } from '../command.ts';
import { stopBot, isRunning, getPid } from '../fs.ts';

export const stopCommand: Command = {
  name: 'stop',
  description: 'Stop the running bot',
  usage: 'biscotto stop',
  async run(ctx) {
    if (!isRunning(ctx.root)) {
      console.log('  Bot is not running.');
      return;
    }

    const pid = getPid(ctx.root);
    console.log(`  Stopping bot (PID: ${pid})...`);

    const stopped = await stopBot(ctx.root);

    if (stopped) {
      console.log('  Bot stopped.');
    } else {
      console.log('  Bot was not running.');
    }
  },
};
