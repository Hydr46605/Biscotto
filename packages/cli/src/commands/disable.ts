import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { readInstalled, writeInstalled, modulesDir } from '../fs.ts';

export const disableCommand: Command = {
  name: 'disable',
  description: 'Disable a module',
  usage: 'biscotto disable <module>',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto disable <module>');
      return;
    }

    const installed = readInstalled(ctx.root);
    const mod = installed.modules[moduleName];

    if (!mod) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    if (mod.enabled === false) {
      console.log(`  Module "${moduleName}" is already disabled`);
      return;
    }

    mod.enabled = false;
    writeInstalled(ctx.root, installed);

    console.log(`  Disabled module: ${moduleName}`);
  },
};
