import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { isRunning, getPid, readInstalled, modulesDir } from '../fs.ts';

interface Manifest {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  provides?: string[];
  requires?: string[];
  storage?: { driver: string };
}

function readManifest(moduleDir: string): Manifest | null {
  const manifestPath = resolve(moduleDir, 'biscotto.json');
  if (!existsSync(manifestPath)) return null;

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
}

export const statusCommand: Command = {
  name: 'status',
  description: 'Show bot and module status',
  usage: 'biscotto status [module]',
  async run(ctx) {
    const running = isRunning(ctx.root);
    const pid = getPid(ctx.root);
    const installed = readInstalled(ctx.root);
    const modsDir = modulesDir(ctx.root);

    // Single module status
    const targetModule = ctx.args[0];
    if (targetModule) {
      const mod = installed.modules[targetModule];
      if (!mod) {
        console.log(`  Module "${targetModule}" is not installed`);
        return;
      }

      const moduleDir = resolve(modsDir, targetModule);
      const manifest = readManifest(moduleDir);
      const enabled = mod.enabled !== false;

      console.log('');
      console.log(`  Module: ${targetModule}@${mod.version}`);
      console.log(`  State:  ${enabled ? 'enabled' : 'disabled'}`);
      if (manifest?.description) console.log(`  Description: ${manifest.description}`);
      if (manifest?.storage) {
        console.log(`  Storage: ${manifest.storage.driver} (.biscotto/data/${targetModule}/)`);
      }
      if (manifest?.dependencies) {
        const deps = Object.entries(manifest.dependencies);
        if (deps.length > 0) {
          console.log(`  Dependencies:`);
          for (const [name, range] of deps) {
            const installedDep = installed.modules[name];
            const status = installedDep ? 'installed' : 'missing';
            console.log(`    ${name}@${range} ${status === 'installed' ? '✓' : '✗'}`);
          }
        }
      }
      if (manifest?.provides && manifest.provides.length > 0) {
        console.log(`  Provides: ${manifest.provides.join(', ')}`);
      }
      if (manifest?.requires && manifest.requires.length > 0) {
        console.log(`  Requires: ${manifest.requires.join(', ')}`);
      }
      console.log('');
      return;
    }

    // Global status
    const moduleNames = Object.keys(installed.modules);
    const enabledCount = moduleNames.filter((n) => installed.modules[n].enabled !== false).length;
    const disabledCount = moduleNames.filter((n) => installed.modules[n].enabled === false).length;

    console.log('');
    console.log(`  Status:    ${running ? 'Running' : 'Not running'}`);
    if (running && pid) console.log(`  PID:       ${pid}`);
    console.log(`  Modules:   ${moduleNames.length} installed (${enabledCount} enabled, ${disabledCount} disabled)`);
    console.log('');

    if (moduleNames.length > 0) {
      console.log('  Modules:');
      for (const name of moduleNames) {
        const mod = installed.modules[name];
        const enabled = mod.enabled !== false;
        const icon = enabled ? '+' : '-';
        const moduleDir = resolve(modsDir, name);
        const manifest = readManifest(moduleDir);
        const storage = manifest?.storage ? ` [${manifest.storage.driver}]` : '';
        console.log(`    [${icon}] ${name}@${mod.version}${storage}`);
      }
      console.log('');
    }
  },
};
