import type { Command } from '../command.ts';
import { readInstalled } from '../fs.ts';

export const listCommand: Command = {
  name: 'list',
  description: 'List installed modules',
  usage: 'biscotto list',
  async run(ctx) {
    const installed = readInstalled(ctx.root);
    const entries = Object.entries(installed.modules);

    if (entries.length === 0) {
      console.log('  No modules installed.');
      return;
    }

    console.log('');
    for (const [name, mod] of entries) {
      const source = mod.source.replace('https://github.com/', '');
      console.log(`  ${name}@${mod.version}`);
      console.log(`    source:   ${source}`);
      console.log(`    installed: ${mod.installedAt}`);
      if (mod.builtAt) console.log(`    built:    ${mod.builtAt}`);
      console.log('');
    }

    console.log(`  ${entries.length} module(s) installed.`);
  },
};
