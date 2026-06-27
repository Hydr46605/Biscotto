import type { Command } from '../command.ts';
import { readInstalled, writeInstalled } from '../fs.ts';

export const enableCommand: Command = {
  name: 'enable',
  description: 'Enable a module',
  usage: 'biscotto enable <module>',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto enable <module>');
      return;
    }

    const installed = readInstalled(ctx.root);
    const mod = installed.modules[moduleName];

    if (!mod) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    if (mod.enabled !== false) {
      console.log(`  Module "${moduleName}" is already enabled`);
      return;
    }

    mod.enabled = true;
    writeInstalled(ctx.root, installed);

    console.log(`  Enabled module: ${moduleName}`);
  },
};
