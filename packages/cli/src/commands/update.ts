import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { readInstalled, writeInstalled, modulesDir } from '../fs.ts';

function exec(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function readManifest(dir: string): { name: string; version: string } | null {
  const file = resolve(dir, 'biscotto.json');
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf-8')); } catch { return null; }
}

export const updateCommand: Command = {
  name: 'update',
  description: 'Update an installed module',
  usage: 'biscotto update <name>  or  biscotto update --all',
  async run(ctx) {
    const installed = readInstalled(ctx.root);
    const names = ctx.args[0] === '--all'
      ? Object.keys(installed.modules)
      : ctx.args;

    if (names.length === 0) {
      console.error('  Error: module name required (or use --all)');
      console.error('  Usage: biscotto update <name>');
      process.exit(1);
    }

    for (const name of names) {
      const mod = installed.modules[name];
      if (!mod) {
        console.error(`  Skipping ${name}: not installed`);
        continue;
      }

      const dir = resolve(modulesDir(ctx.root), name);
      if (!existsSync(dir)) {
        console.error(`  Skipping ${name}: directory not found`);
        continue;
      }

      console.log(`  Updating ${name}...`);

      try {
        exec('git pull', dir);
      } catch {
        console.error(`  Error: git pull failed for ${name}`);
        continue;
      }

      // Rebuild
      if (existsSync(resolve(dir, 'tsconfig.json'))) {
        console.log(`  Rebuilding...`);
        try { exec('npx tsc', dir); } catch { console.warn(`  Warning: build failed`); }
      }

      // Update version in installed.json
      const manifest = readManifest(dir);
      if (manifest) {
        installed.modules[name] = {
          ...mod,
          version: manifest.version,
          builtAt: new Date().toISOString(),
        };
      }
    }

    writeInstalled(ctx.root, installed);
    console.log(`  Updated ${names.length} module(s).`);
  },
};
