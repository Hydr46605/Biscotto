import type { Command } from '../command.ts';
import { isRunning, getPid, readInstalled } from '../fs.ts';

export const statusCommand: Command = {
  name: 'status',
  description: 'Show bot status',
  usage: 'biscotto status',
  async run(ctx) {
    const running = isRunning(ctx.root);
    const pid = getPid(ctx.root);
    const installed = readInstalled(ctx.root);
    const moduleCount = Object.keys(installed.modules).length;

    console.log('');
    console.log(`  Status:   ${running ? 'Running' : 'Not running'}`);
    if (running && pid) console.log(`  PID:      ${pid}`);
    console.log(`  Modules:  ${moduleCount} installed`);
    console.log('');
  },
};
