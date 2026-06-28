import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { copyTemplate, getTemplatesDir, hasTemplates } from '../template.ts';

function gitConfig(key: string): string | undefined {
  try {
    return execSync(`git config user.${key}`, { encoding: 'utf-8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new Biscotto module',
  usage: 'biscotto create <name>',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto create <name>');
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

    const author = gitConfig('name') ?? 'Author';
    const authorUrl = gitConfig('url') ?? 'https://github.com/yourname';

    console.log(`  Creating module: ${moduleName}`);

    mkdirSync(moduleDir, { recursive: true });

    copyTemplate(resolve(templatesDir, 'module'), moduleDir, {
      vars: {
        MODULE_NAME: moduleName,
        DESCRIPTION: `A Biscotto module`,
        AUTHOR: author,
        AUTHOR_URL: authorUrl,
      },
      features: [],
    });

    console.log('');
    console.log(`  Module created at modules/${moduleName}/`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd modules/${moduleName}`);
    console.log('    npm install');
    console.log('    npm run build');
  },
};
