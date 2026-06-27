import type { Command } from '../command.ts';
import { readInstalled } from '../fs.ts';
import { resolve, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';

function getConfigDir(root: string, moduleName: string): string {
  return join(root, '.biscotto', 'configs', moduleName);
}

function getConfigPath(root: string, moduleName: string): string {
  return join(getConfigDir(root, moduleName), 'config.json');
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
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => {
    const stat = statSync(join(dir, f));
    return stat.isFile();
  });
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
      console.log('    biscotto config Shop                 Show all config for Shop');
      console.log('    biscotto config Shop taxRate         Show the "taxRate" value');
      console.log('    biscotto config Shop taxRate 0.15    Set "taxRate" to 0.15');
      console.log('    biscotto config Shop --files         List files in module data dir');
      return;
    }

    const installed = readInstalled(ctx.root);
    if (!installed.modules[moduleName]) {
      console.log(`  Module "${moduleName}" is not installed`);
      return;
    }

    const configDir = getConfigDir(ctx.root, moduleName);

    // List files mode
    if (ctx.args[1] === '--files') {
      const files = listFiles(configDir);
      if (files.length === 0) {
        console.log(`  No files in ${moduleName} data directory`);
        return;
      }
      console.log(`  Files in ${moduleName}:`);
      for (const f of files) {
        const stat = statSync(join(configDir, f));
        const size = stat.size < 1024 ? `${stat.size}B` : `${(stat.size / 1024).toFixed(1)}KB`;
        console.log(`    ${f} (${size})`);
      }
      return;
    }

    const key = ctx.args[1];
    const value = ctx.args.slice(2).join(' ');

    const config = readConfig(ctx.root, moduleName);

    if (!key) {
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
      if (!config || !(key in config)) {
        console.log(`  Key "${key}" not found in "${moduleName}" config`);
        return;
      }

      const v = config[key];
      console.log(typeof v === 'string' ? v : JSON.stringify(v));
      return;
    }

    if (!config) {
      console.log(`  No config found for "${moduleName}". Config is created when the module first loads.`);
      return;
    }

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
