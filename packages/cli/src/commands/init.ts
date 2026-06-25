import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { ensureBiscottoDir, writeInstalled } from '../fs.ts';
import { copyTemplate, copyFile, getTemplatesDir, hasTemplates } from '../template.ts';

function scaffold(ctx: {
  root: string;
  moduleName: string;
  description: string;
  author: string;
  authorUrl: string;
}): void {
  const { root, moduleName, description, author, authorUrl } = ctx;
  const templatesDir = getTemplatesDir();

  if (!hasTemplates()) {
    throw new Error('Templates directory not found');
  }

  // Create .biscotto directory
  ensureBiscottoDir(root);
  writeInstalled(root, { version: 1, modules: {} });

  // Copy .env
  const envSrc = resolve(templatesDir, 'env.example');
  const envDest = resolve(root, '.env');
  if (!existsSync(envDest)) {
    copyFile(envSrc, envDest, { MODULE_NAME: moduleName });
  }

  // Copy module template
  const moduleSrc = resolve(templatesDir, 'module');
  const moduleDest = resolve(root, 'modules', moduleName);
  mkdirSync(moduleDest, { recursive: true });
  copyTemplate(moduleSrc, moduleDest, {
    MODULE_NAME: moduleName,
    DESCRIPTION: description,
    AUTHOR: author,
    AUTHOR_URL: authorUrl,
  });
}

export const initCommand: Command = {
  name: 'init',
  description: 'Initialize a new Biscotto project',
  usage: 'biscotto init [directory]',
  async run(ctx) {
    const target = ctx.args[0]
      ? resolve(ctx.root, ctx.args[0])
      : ctx.root;

    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    scaffold({
      root: target,
      moduleName: 'zero',
      description: 'Core module — base scaffold for Biscotto',
      author: 'Hydr46605',
      authorUrl: 'https://github.com/Hydr46605',
    });

    console.log(`  Initialized Biscotto project in ${target}`);
    console.log(`  Next steps:`);
    console.log(`    1. Edit .env with your bot token`);
    console.log(`    2. npm install`);
    console.log(`    3. biscotto start`);
  },
};
