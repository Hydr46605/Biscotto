import type { Command } from '../command.ts';
import {
  readInstalled,
  writeInstalled,
  isRunning,
  reloadFlagFile,
  writeAtomicJson,
} from '../fs.ts';

/**
 * Trigger an in-process module re-route. If the bot is currently running,
 * drops an atomic IPC file at `.biscotto/reload.json` whose presence and
 * contents the running bot\u2019s hot-reload poller consumes on its next tick.
 * If the bot is not running, falls back to flipping the `enabled` flag
 * in installed.json so the next `biscotto start` re-loads the module.
 */
export const reloadCommand: Command = {
  name: 'reload',
  description: 'Reload a module (disable + enable)',
  usage: 'biscotto reload <module>',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto reload <module>');
      console.log('  Triggers a hot reload of the named module in the running bot,');
      console.log('  or toggles its enabled flag if the bot is not running.');
      return;
    }

    const installed = readInstalled(ctx.root);
    const mod = installed.modules[moduleName];

    if (!mod) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    if (isRunning(ctx.root)) {
      // Hot reload via file-based IPC: the running bot polls for this file.
      try {
        writeAtomicJson(reloadFlagFile(ctx.root), {
          module: moduleName,
          ts: Date.now(),
        });
        console.log(`  Reload signal sent for: ${moduleName}`);
        console.log('  The bot will reload this module within ~500 ms.');
      } catch (error) {
        console.log(`  Error: could not write reload signal: ${error}`);
        process.exit(1);
      }
      return;
    }

    // Bot is not running. Toggle enabled flag so next start picks up the change.
    const wasEnabled = mod.enabled !== false;
    mod.enabled = !wasEnabled;
    writeInstalled(ctx.root, installed);

    if (wasEnabled) {
      console.log(`  Reloading module: ${moduleName}`);
      console.log('  (Module will be re-loaded on next bot start)');
    } else {
      console.log(`  Enabled module: ${moduleName}`);
      console.log('  (Module will be loaded on next bot start)');
    }

    console.log('');
    console.log('  Bot is not running. Start it with: biscotto start');
  },
};
