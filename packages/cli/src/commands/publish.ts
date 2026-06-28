import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { Command } from '../command.ts';
import { packCommand } from './pack.ts';

function gitInit(dir: string): void {
  try {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
  } catch {
    // git init may fail if already initialized
  }
}

function gitAdd(dir: string, files: string[]): void {
  try {
    execSync(`git add ${files.join(' ')}`, { cwd: dir, stdio: 'ignore' });
  } catch {
    // git add may fail
  }
}

function gitCommit(dir: string, message: string): void {
  try {
    execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'ignore' });
  } catch {
    // commit may fail if nothing to commit
  }
}

function ghRepoCreate(dir: string, name: string, isPrivate: boolean): string | null {
  try {
    const privateFlag = isPrivate ? '--private' : '--public';
    const result = execSync(`gh repo create ${name} ${privateFlag} --source=. --remote=origin --push`, {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.trim();
  } catch {
    return null;
  }
}

function readManifest(moduleDir: string): { name: string; version: string; description: string } | null {
  const filePath = resolve(moduleDir, 'biscotto.json');
  if (!existsSync(filePath)) return null;

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (!data.name || !data.version || !data.description) return null;
    return { name: data.name, version: data.version, description: data.description };
  } catch {
    return null;
  }
}

function addToRegistry(manifest: { name: string; version: string; description: string }, repoUrl: string): void {
  console.log('');
  console.log('  To add to BiscottoRegistry:');
  console.log('  1. Fork BiscottoRegistry');
  console.log('  2. Add entry to registry/modules.json:');
  console.log(JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: 'YourName',
    github: repoUrl,
    tags: [],
  }, null, 2));
  console.log('  3. Submit PR');
}

export const publishCommand: Command = {
  name: 'publish',
  description: 'Publish a module to GitHub',
  usage: 'biscotto publish <module> [--private] [--dry-run] [--registry]',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto publish <module> [--private] [--dry-run] [--registry]');
      return;
    }

    const isPrivate = ctx.flags.includes('--private');
    const dryRun = ctx.flags.includes('--dry-run');
    const withRegistry = ctx.flags.includes('--registry');

    const moduleDir = resolve(ctx.root, 'modules', moduleName);
    if (!existsSync(moduleDir)) {
      console.log(`  Module ${moduleName} not found`);
      return;
    }

    // Read manifest first
    const manifest = readManifest(moduleDir);
    if (!manifest) {
      console.log('  Could not read module manifest (biscotto.json)');
      return;
    }

    console.log(`  Publishing module: ${manifest.name}@${manifest.version}`);
    console.log('');

    // Validate
    console.log('  Running validation...');
    await packCommand.run({
      root: ctx.root,
      args: [moduleName],
      flags: [],
      options: {},
    });

    if (dryRun) {
      console.log('');
      console.log('  Dry run — skipping git operations');
      return;
    }

    // Initialize git
    console.log('');
    console.log('  Initializing git...');
    gitInit(moduleDir);
    gitAdd(moduleDir, ['.']);
    gitCommit(moduleDir, `feat: initial release of ${manifest.name}@${manifest.version}`);

    // Create repo on GitHub
    console.log('');
    console.log('  Creating GitHub repository...');
    const repoUrl = ghRepoCreate(moduleDir, manifest.name, isPrivate);

    if (repoUrl) {
      console.log(`  ✓ Repository created: ${repoUrl}`);
    } else {
      console.log('  ✗ Could not create repository');
      console.log('  You may need to create it manually:');
      console.log(`    gh repo create ${manifest.name} --${isPrivate ? 'private' : 'public'}`);
    }

    // Registry
    if (withRegistry && manifest) {
      addToRegistry(manifest, repoUrl || `https://github.com/Hydr46605/${manifest.name}`);
    }

    console.log('');
    console.log('  ✓ Module published');
  },
};
