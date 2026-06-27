import type { Command } from '../command.ts';
import { readInstalled, writeInstalled, isRunning } from '../fs.ts';

export const reloadCommand: Command = {
  name: 'reload',
  description: 'Reload a module (disable + enable)',
  usage: 'biscotto reload <module>',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto reload <module>');
      return;
    }

    const installed = readInstalled(ctx.root);
    const mod = installed.modules[moduleName];

    if (!mod) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    // Toggle: if enabled, disable then enable; if disabled, just enable
    const wasEnabled = mod.enabled !== false;
    mod.enabled = !wasEnabled;
    writeInstalled(ctx.root, installed);

    if (wasEnabled) {
      console.log(`  Reloading module: ${moduleName}`);
      console.log(`  (Module will be reloaded on next bot start)`);
    } else {
      console.log(`  Enabled module: ${moduleName}`);
      console.log(`  (Module will be loaded on next bot start)`);
    }

    if (isRunning(ctx.root)) {
      console.log('');
      console.log('  Bot is running. Restart to apply changes:');
      console.log('    biscotto restart');
    }
  },
};
