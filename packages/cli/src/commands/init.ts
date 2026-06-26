import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { Command } from '../command.ts';
import { ensureBiscottoDir, writeInstalled } from '../fs.ts';
import { copyTemplate, copyFile, getTemplatesDir, hasTemplates } from '../template.ts';

interface InitOptions {
  projectDir: string;
  projectName: string;
  author: string;
  authorUrl: string;
}

function scaffoldProject(opts: InitOptions): void {
  const { projectDir, projectName, author, authorUrl } = opts;
  const templatesDir = getTemplatesDir();

  if (!hasTemplates()) {
    throw new Error('Templates directory not found');
  }

  // Create .biscotto directory
  ensureBiscottoDir(projectDir);
  writeInstalled(projectDir, { version: 1, modules: {} });

  // Copy .env
  const envSrc = resolve(templatesDir, 'project', '.env.example');
  const envDest = resolve(projectDir, '.env');
  if (!existsSync(envDest)) {
    copyFile(envSrc, envDest);
  }

  // Copy package.json
  const pkgSrc = resolve(templatesDir, 'project', 'package.json');
  const pkgDest = resolve(projectDir, 'package.json');
  copyFile(pkgSrc, pkgDest, { PROJECT_NAME: projectName });

  // Copy tsconfig.json
  const tsconfigSrc = resolve(templatesDir, 'project', 'tsconfig.json');
  const tsconfigDest = resolve(projectDir, 'tsconfig.json');
  copyFile(tsconfigSrc, tsconfigDest);

  // Copy src/index.ts
  const srcIndexSrc = resolve(templatesDir, 'project', 'src', 'index.ts');
  const srcIndexDest = resolve(projectDir, 'src', 'index.ts');
  mkdirSync(resolve(projectDir, 'src'), { recursive: true });
  copyFile(srcIndexSrc, srcIndexDest);

  // Copy module template as default module
  const moduleSrc = resolve(templatesDir, 'module');
  const moduleDest = resolve(projectDir, 'modules', 'zero');
  mkdirSync(moduleDest, { recursive: true });
  copyTemplate(moduleSrc, moduleDest, {
    vars: {
      MODULE_NAME: 'zero',
      DESCRIPTION: 'Core module for Biscotto',
      AUTHOR: author,
      AUTHOR_URL: authorUrl,
    },
    features: ['commands'],
  });
}

export const initCommand: Command = {
  name: 'init',
  description: 'Initialize a new Biscotto project',
  usage: 'biscotto init [name]',
  async run(ctx) {
    const projectName = ctx.args[0] || 'my-bot';
    const projectDir = resolve(ctx.root, projectName);

    if (existsSync(projectDir)) {
      console.log(`  Directory ${projectName} already exists`);
      return;
    }

    scaffoldProject({
      projectDir,
      projectName,
      author: 'Hydr46605',
      authorUrl: 'https://github.com/Hydr46605',
    });

    console.log(`  Initialized Biscotto project in ${projectDir}`);
    console.log('');
    console.log(`  Next steps:`);
    console.log(`    cd ${projectName}`);
    console.log(`    npm install`);
    console.log(`    # Edit .env with your bot token`);
    console.log(`    biscotto dev`);
  },
};
