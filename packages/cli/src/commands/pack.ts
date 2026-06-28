import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';

interface Manifest {
  name?: string;
  version?: string;
  description?: string;
  author?: { name: string; url?: string };
  entry?: string;
  tags?: string[];
}

function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version);
}

function readManifest(moduleDir: string): { manifest: Manifest; errors: string[] } {
  const errors: string[] = [];
  const filePath = resolve(moduleDir, 'biscotto.json');

  if (!existsSync(filePath)) {
    errors.push('biscotto.json not found');
    return { manifest: {}, errors };
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    errors.push('biscotto.json is not valid JSON');
    return { manifest: {}, errors };
  }

  if (!manifest.name) errors.push('Missing name field');
  if (!manifest.version) errors.push('Missing version field');
  if (!manifest.description) errors.push('Missing description field');
  if (!manifest.author) errors.push('Missing author field');

  if (manifest.version && !isValidSemver(manifest.version)) {
    errors.push(`Invalid version format: ${manifest.version}`);
  }

  return { manifest, errors };
}

function checkEntry(moduleDir: string): string[] {
  const errors: string[] = [];
  const indexPath = resolve(moduleDir, 'src', 'index.ts');

  if (!existsSync(indexPath)) {
    errors.push('src/index.ts not found');
    return errors;
  }

  const content = readFileSync(indexPath, 'utf-8');
  if (!content.includes('defineModule')) {
    errors.push('src/index.ts does not export defineModule');
  }

  return errors;
}

function checkPlaceholders(moduleDir: string): string[] {
  const warnings: string[] = [];
  const files = ['biscotto.json', 'src/index.ts'];

  for (const file of files) {
    const filePath = resolve(moduleDir, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      if (/\{\{[^}]+\}\}/.test(content)) {
        warnings.push(`${file} contains unreplaced placeholders`);
      }
    }
  }

  return warnings;
}

export const packCommand: Command = {
  name: 'pack',
  description: 'Validate a module for publishing',
  usage: 'biscotto pack [module]',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto pack <module>');
      return;
    }

    const moduleDir = resolve(ctx.root, 'modules', moduleName);
    if (!existsSync(moduleDir)) {
      console.log(`  Module ${moduleName} not found`);
      return;
    }

    console.log(`  Validating module: ${moduleName}`);
    console.log('');

    let allErrors: string[] = [];
    let allWarnings: string[] = [];

    // Check manifest
    console.log('  Checking biscotto.json...');
    const { errors: manifestErrors } = readManifest(moduleDir);
    if (manifestErrors.length === 0) {
      console.log('  ✓ Manifest valid');
    } else {
      console.log('  ✗ Manifest errors:');
      manifestErrors.forEach((e) => console.log(`    - ${e}`));
      allErrors = allErrors.concat(manifestErrors);
    }

    // Check entry point
    console.log('  Checking entry point...');
    const entryErrors = checkEntry(moduleDir);
    if (entryErrors.length === 0) {
      console.log('  ✓ Entry point valid');
    } else {
      console.log('  ✗ Entry point errors:');
      entryErrors.forEach((e) => console.log(`    - ${e}`));
      allErrors = allErrors.concat(entryErrors);
    }

    // Check for placeholders
    console.log('  Checking for placeholders...');
    const placeholderWarnings = checkPlaceholders(moduleDir);
    if (placeholderWarnings.length === 0) {
      console.log('  ✓ No placeholders found');
    } else {
      console.log('  ⚠ Warnings:');
      placeholderWarnings.forEach((w) => console.log(`    - ${w}`));
      allWarnings = allWarnings.concat(placeholderWarnings);
    }

    // Summary
    console.log('');
    if (allErrors.length === 0) {
      console.log('  ✓ Module is ready to publish');
    } else {
      console.log(`  ✗ Found ${allErrors.length} error(s)`);
      process.exit(1);
    }
  },
};
