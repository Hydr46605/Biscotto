import type { Command } from '../command.ts';
import { readInstalled } from '../fs.ts';
import { resolve, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function getConfigPath(root: string, moduleName: string): string {
  return join(root, '.biscotto', 'configs', `${moduleName}.json`);
}

function readConfig(root: string, moduleName: string): Record<string, unknown> | null {
  const configPath = getConfigPath(root, moduleName);
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeConfig(root: string, moduleName: string, config: Record<string, unknown>): void {
  const configPath = getConfigPath(root, moduleName);
  const dir = resolve(configPath, '..');
  if (!existsSync(dir)) {
    const { mkdirSync } = require('node:fs');
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export const configCommand: Command = {
  name: 'config',
  description: 'View or edit module configuration',
  usage: 'biscotto config <module> [key] [value]',
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto config <module> [key] [value]');
      console.log('');
      console.log('  Examples:');
      console.log('    biscotto config zero                 Show all config for zero');
      console.log('    biscotto config zero prefix          Show the "prefix" value');
      console.log('    biscotto config zero prefix !        Set "prefix" to "!"');
      return;
    }

    const installed = readInstalled(ctx.root);
    if (!installed.modules[moduleName]) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    const key = ctx.args[1];
    const value = ctx.args.slice(2).join(' ');

    // Read current config
    const config = readConfig(ctx.root, moduleName);

    if (!key) {
      // Show all config
      if (!config || Object.keys(config).length === 0) {
        console.log(`  No config found for "${moduleName}"`);
        console.log('  Config is created automatically when the module first loads.');
        return;
      }

      console.log(`  Config for "${moduleName}":`);
      console.log('');
      for (const [k, v] of Object.entries(config)) {
        const display = typeof v === 'string' ? v : JSON.stringify(v);
        console.log(`    ${k} = ${display}`);
      }
      return;
    }

    if (!value) {
      // Show specific key
      if (!config || !(key in config)) {
        console.log(`  Key "${key}" not found in "${moduleName}" config`);
        return;
      }

      const v = config[key];
      console.log(typeof v === 'string' ? v : JSON.stringify(v));
      return;
    }

    // Set key to value
    if (!config) {
      console.log(`  No config found for "${moduleName}". Config is created when the module first loads.`);
      return;
    }

    // Try to parse JSON values
    let parsed: unknown = value;
    if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    else if (value === 'null') parsed = null;
    else if (/^\d+$/.test(value)) parsed = parseInt(value, 10);
    else if (/^\d*\.\d+$/.test(value)) parsed = parseFloat(value);
    else {
      try { parsed = JSON.parse(value); } catch { /* keep as string */ }
    }

    const old = config[key];
    config[key] = parsed;
    writeConfig(ctx.root, moduleName, config);

    const oldDisplay = old === undefined ? '(undefined)' : (typeof old === 'string' ? old : JSON.stringify(old));
    const newDisplay = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    console.log(`  ${moduleName}.${key}: ${oldDisplay} → ${newDisplay}`);
  },
};
