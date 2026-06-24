import type { Client } from 'discord.js';
import type { HydrottoModule, CommandDefinition, EventDefinition } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

interface LoadedModule {
  instance: HydrottoModule;
  commands: CommandDefinition[];
  events: EventDefinition[];
}

export class ModuleLoader {
  private loaded: LoadedModule[] = [];

  constructor(private readonly client: Client) {}

  async loadAll(modules: HydrottoModule[]): Promise<void> {
    LitLogger.info('Loader', `Discovering ${modules.length} module(s)...`);

    for (const mod of modules) {
      await this.load(mod);
    }

    const totalCmds = this.loaded.reduce((a, m) => a + m.commands.length, 0);
    const totalEvts = this.loaded.reduce((a, m) => a + m.events.length, 0);
    LitLogger.info('Loader', `Loaded ${this.loaded.length} module(s) \u2014 ${totalCmds} command(s), ${totalEvts} event(s)`);
  }

  private async load(mod: HydrottoModule): Promise<void> {
    const { manifest } = mod;

    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.loaded.some((m) => m.instance.manifest.name === dep)) {
          LitLogger.error('Loader', `Module "${manifest.name}" requires "${dep}" which is not loaded`);
          return;
        }
      }
    }

    try {
      const registration = mod.register();
      const cmds = registration.commands ?? [];
      const evts = registration.events ?? [];

      this.loaded.push({ instance: mod, commands: cmds, events: evts });

      if (mod.onInit) {
        await mod.onInit(this.client);
      }

      const desc = manifest.description ? ` \u2014 ${manifest.description}` : '';
      LitLogger.tree('Loader', `\u251c\u2500`, `${manifest.name} v${manifest.version}${desc}`);
      if (cmds.length > 0) {
        LitLogger.tree('Loader', `\u2502  `, `Commands: ${cmds.map((c) => c.data.name).join(', ')}`, 'debug');
      }
      if (evts.length > 0) {
        LitLogger.tree('Loader', `\u2502  `, `Events: ${evts.map((e) => e.event).join(', ')}`, 'debug');
      }
    } catch (error) {
      LitLogger.error('Loader', `Failed to load module "${manifest.name}": ${error}`);
    }
  }

  getCommands(): CommandDefinition[] {
    return this.loaded.flatMap((m) => m.commands);
  }

  getEvents(): EventDefinition[] {
    return this.loaded.flatMap((m) => m.events);
  }

  async destroyAll(): Promise<void> {
    LitLogger.info('Loader', 'Destroying all modules...');
    for (const mod of this.loaded) {
      if (mod.instance.onDestroy) {
        await mod.instance.onDestroy();
        LitLogger.debug('Loader', `Destroyed: ${mod.instance.manifest.name}`);
      }
    }
    this.loaded = [];
  }
}
