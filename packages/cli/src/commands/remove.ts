import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { readInstalled, writeInstalled, modulesDir } from '../fs.ts';

export const removeCommand: Command = {
  name: 'remove',
  description: 'Uninstall a module',
  usage: 'biscotto remove <name>',
  async run(ctx) {
    if (ctx.args.length === 0) {
      console.error('  Error: module name required');
      console.error('  Usage: biscotto remove <name>');
      process.exit(1);
    }

    const name = ctx.args[0];
    const installed = readInstalled(ctx.root);

    if (!installed.modules[name]) {
      console.error(`  Error: module "${name}" is not installed`);
      process.exit(1);
    }

    // Remove directory
    const dir = resolve(modulesDir(ctx.root), name);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }

    // Remove from installed.json
    delete installed.modules[name];
    writeInstalled(ctx.root, installed);

    console.log(`  Removed ${name}`);
  },
};
