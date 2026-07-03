import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { ensureBiscottoDir, readInstalled, writeInstalled, modulesDir } from '../fs.ts';

function resolveSource(input: string): string {
  // If it looks like a URL, use as-is
  if (input.startsWith('http://') || input.startsWith('https://')) return input;

  // If it contains a slash, treat as GitHub shorthand: user/repo
  if (input.includes('/')) return `https://github.com/${input}.git`;

  // Otherwise assume user/repo format
  return `https://github.com/${input}.git`;
}

function readManifest(dir: string): { name: string; version: string; entry?: string } | null {
  const file = resolve(dir, 'biscotto.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function exec(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

export const addCommand: Command = {
  name: 'add',
  description: 'Install a module from a Git repository',
  usage: 'biscotto add <source>  (e.g. user/repo or github.com/user/repo)',
  async run(ctx) {
    if (ctx.args.length === 0) {
      console.error('  Error: module source required');
      console.error('  Usage: biscotto add <source>');
      process.exit(1);
    }

    const source = resolveSource(ctx.args[0]);
    const url = new URL(source);
    const repoName = url.pathname.split('/').pop()?.replace('.git', '') ?? 'unknown';

    const modsDir = modulesDir(ctx.root);
    const targetDir = resolve(modsDir, repoName);

    if (existsSync(targetDir)) {
      console.error(`  Error: module "${repoName}" is already installed`);
      process.exit(1);
    }

    console.log(`  Cloning ${source}...`);

    try {
      exec(`git clone --depth 1 ${source} ${targetDir}`, ctx.root);
    } catch {
      console.error(`  Error: failed to clone ${source}`);
      process.exit(1);
    }

    // Read manifest
    const manifest = readManifest(targetDir);
    if (!manifest) {
      console.error(`  Error: no valid biscotto.json found in ${repoName}`);
      rmSync(targetDir, { recursive: true, force: true });
      process.exit(1);
    }

    // Install dependencies
    if (existsSync(resolve(targetDir, 'package.json'))) {
      console.log(`  Installing dependencies...`);
      try {
        exec('npm install', targetDir);
      } catch {
        console.warn(`  Warning: npm install failed, continuing anyway`);
      }
    }

    // Build if tsconfig exists
    if (existsSync(resolve(targetDir, 'tsconfig.json'))) {
      console.log(`  Building...`);
      try {
        exec('npx tsc', targetDir);
      } catch {
        console.warn(`  Warning: build failed, module may not work`);
      }
    }

    // Register in installed.json
    ensureBiscottoDir(ctx.root);
    const installed = readInstalled(ctx.root);
    installed.modules[manifest.name] = {
      source,
      version: manifest.version,
      installedAt: new Date().toISOString(),
      enabled: true,
    };
    writeInstalled(ctx.root, installed);

    console.log(`  Installed ${manifest.name}@${manifest.version}`);
  },
};
