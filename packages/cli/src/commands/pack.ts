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

function checkManifest(moduleDir: string): string[] {
  const errors: string[] = [];
  const manifestPath = resolve(moduleDir, 'manifest.ts');

  if (!existsSync(manifestPath)) {
    errors.push('manifest.ts not found');
    return errors;
  }

  const content = readFileSync(manifestPath, 'utf-8');

  // Basic field checks (name appears in manifest.name: 'xxx')
  if (!content.includes('name:')) {
    errors.push('Missing name field');
  }
  if (!content.includes('version:')) {
    errors.push('Missing version field');
  }
  if (!content.includes('description:')) {
    errors.push('Missing description field');
  }
  if (!content.includes('author:')) {
    errors.push('Missing author field');
  }

  // Version format
  const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
  if (versionMatch && !isValidSemver(versionMatch[1])) {
    errors.push(`Invalid version format: ${versionMatch[1]}`);
  }

  return errors;
}

function checkEntry(moduleDir: string): string[] {
  const errors: string[] = [];
  const indexPath = resolve(moduleDir, 'index.ts');

  if (!existsSync(indexPath)) {
    errors.push('index.ts not found');
    return errors;
  }

  const content = readFileSync(indexPath, 'utf-8');
  if (!content.includes('defineModule')) {
    errors.push('index.ts does not export defineModule');
  }

  return errors;
}

function checkPlaceholders(moduleDir: string): string[] {
  const warnings: string[] = [];
  const files = ['manifest.ts', 'index.ts', 'commands/ping.ts', 'listeners/ready.ts'];

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
    console.log('  Checking manifest...');
    const manifestErrors = checkManifest(moduleDir);
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
