import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { copyTemplate, getTemplatesDir, hasTemplates } from '../template.ts';

const STACKS = {
  simple: { commands: true },
  full: { commands: true, buttons: true, modals: true, selects: true },
  voice: { commands: true, voice: true },
  storage: { commands: true, storage: true },
  moderate: { commands: true, buttons: true },
};

type StackName = keyof typeof STACKS;

function getFeaturesForStack(stack: StackName): string[] {
  const config = STACKS[stack] || STACKS.simple;
  return Object.entries(config)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new Biscotto module',
  usage: 'biscotto create <name> [--stack <stack>]',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto create <name> [--stack <stack>]');
      console.log('');
      console.log('  Stacks: simple, full, voice, storage, moderate');
      return;
    }

    const stackName: StackName = (ctx.options.stack as StackName) || 'simple';

    if (!STACKS[stackName]) {
      console.log(`  Unknown stack: ${stackName}`);
      console.log('  Available stacks: simple, full, voice, storage, moderate');
      return;
    }

    const templatesDir = getTemplatesDir();
    if (!hasTemplates()) {
      console.log('  Templates directory not found');
      return;
    }

    const moduleDir = resolve(ctx.root, 'modules', moduleName);
    if (existsSync(moduleDir)) {
      console.log(`  Module ${moduleName} already exists`);
      return;
    }

    const features = getFeaturesForStack(stackName);

    console.log(`  Creating module: ${moduleName}`);
    console.log(`  Stack: ${stackName}`);
    console.log(`  Features: ${features.join(', ')}`);

    mkdirSync(moduleDir, { recursive: true });

    copyTemplate(resolve(templatesDir, 'module'), moduleDir, {
      vars: {
        MODULE_NAME: moduleName,
        DESCRIPTION: `A ${stackName} module for Biscotto`,
        AUTHOR: 'Hydr46605',
        AUTHOR_URL: 'https://github.com/Hydr46605',
      },
      features,
    });

    console.log('');
    console.log(`  Module created at modules/${moduleName}/`);
    console.log('');
    console.log('  Files created:');
    console.log('    manifest.ts      Module manifest');
    console.log('    registry.ts      Module registry');
    console.log('    index.ts         Module entry');
    console.log('    commands/ping.ts Example command');
    console.log('    listeners/ready.ts Ready event');
    if (features.includes('buttons')) {
      console.log('    components/buttons.ts Example button');
    }
    if (features.includes('modals')) {
      console.log('    components/modals.ts Example modal');
    }
    if (features.includes('selects')) {
      console.log('    components/selects.ts Example select menu');
    }
    console.log('    README.md        Module documentation');
  },
};
