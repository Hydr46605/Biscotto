import type { Client, GatewayIntentBits } from 'discord.js';
import type {
  BiscottoModule,
  CommandDefinition,
  ButtonDefinition,
  SelectMenuDefinition,
  ModalDefinition,
  AutocompleteDefinition,
  UserContextMenuDefinition,
  MessageContextMenuDefinition,
  EventDefinition,
} from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

interface LoadedModule {
  instance: BiscottoModule & { intents?: GatewayIntentBits[] };
  commands: CommandDefinition[];
  buttons: ButtonDefinition[];
  selectMenus: SelectMenuDefinition[];
  modals: ModalDefinition[];
  autocompletes: AutocompleteDefinition[];
  userContextMenus: UserContextMenuDefinition[];
  messageContextMenus: MessageContextMenuDefinition[];
  events: EventDefinition[];
}

type ModuleLike = BiscottoModule & { intents?: GatewayIntentBits[] };

export class ModuleLoader {
  private loaded: LoadedModule[] = [];
  private client: Client | null = null;

  async loadAll(modules: ModuleLike[], client?: Client): Promise<void> {
    if (client) this.client = client;

    LitLogger.info('Loader', `Discovering ${modules.length} module(s)...`);

    for (const mod of modules) {
      await this.load(mod);
    }

    const totalCmds = this.loaded.reduce((a, m) => a + m.commands.length, 0);
    const totalBtns = this.loaded.reduce((a, m) => a + m.buttons.length, 0);
    const totalMenus = this.loaded.reduce((a, m) => a + m.selectMenus.length, 0);
    const totalModals = this.loaded.reduce((a, m) => a + m.modals.length, 0);
    const totalEvents = this.loaded.reduce((a, m) => a + m.events.length, 0);
    const total = totalCmds + totalBtns + totalMenus + totalModals + totalEvents;
    LitLogger.info('Loader', `Loaded ${this.loaded.length} module(s) \u2014 ${total} interaction(s)`);
  }

  private async load(mod: ModuleLike): Promise<void> {
    const { manifest } = mod;

    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (!this.loaded.some((m) => m.instance.manifest.name === dep)) {
          LitLogger.error('Loader', `Module "${manifest.name}" requires "${dep}" which is not loaded`);
          return;
        }
      }
    }

    try {
      const registration = mod.register();
      const cmds = registration.commands ?? [];
      const btns = registration.buttons ?? [];
      const menus = registration.selectMenus ?? [];
      const modals = registration.modals ?? [];
      const acs = registration.autocompletes ?? [];
      const ucms = registration.userContextMenus ?? [];
      const mcms = registration.messageContextMenus ?? [];
      const evts = registration.events ?? [];

      this.loaded.push({
        instance: mod,
        commands: cmds,
        buttons: btns,
        selectMenus: menus,
        modals: modals,
        autocompletes: acs,
        userContextMenus: ucms,
        messageContextMenus: mcms,
        events: evts,
      });

      if (mod.onInit && this.client) {
        await mod.onInit(this.client);
      }

      const desc = manifest.description ? ` - ${manifest.description}` : '';
      LitLogger.tree('Loader', '|-', `${manifest.name} v${manifest.version}${desc}`);
      if (cmds.length > 0) {
        LitLogger.tree('Loader', '| ', `Commands: ${cmds.map((c) => c.data.name).join(', ')}`, 'debug');
      }
      if (btns.length > 0) {
        LitLogger.tree('Loader', '| ', `Buttons: ${btns.map((b) => b.customId).join(', ')}`, 'debug');
      }
      if (menus.length > 0) {
        LitLogger.tree('Loader', '| ', `SelectMenus: ${menus.map((m) => m.customId).join(', ')}`, 'debug');
      }
      if (modals.length > 0) {
        LitLogger.tree('Loader', '| ', `Modals: ${modals.map((m) => m.customId).join(', ')}`, 'debug');
      }
      if (evts.length > 0) {
        LitLogger.tree('Loader', '| ', `Events: ${evts.map((e) => e.event).join(', ')}`, 'debug');
      }
    } catch (error) {
      LitLogger.error('Loader', `Failed to load module "${manifest.name}": ${error}`);
    }
  }

  getCommands(): CommandDefinition[] {
    return this.loaded.flatMap((m) => m.commands);
  }

  getButtons(): ButtonDefinition[] {
    return this.loaded.flatMap((m) => m.buttons);
  }

  getSelectMenus(): SelectMenuDefinition[] {
    return this.loaded.flatMap((m) => m.selectMenus);
  }

  getModals(): ModalDefinition[] {
    return this.loaded.flatMap((m) => m.modals);
  }

  getAutocompletes(): AutocompleteDefinition[] {
    return this.loaded.flatMap((m) => m.autocompletes);
  }

  getUserContextMenus(): UserContextMenuDefinition[] {
    return this.loaded.flatMap((m) => m.userContextMenus);
  }

  getMessageContextMenus(): MessageContextMenuDefinition[] {
    return this.loaded.flatMap((m) => m.messageContextMenus);
  }

  getEvents(): EventDefinition[] {
    return this.loaded.flatMap((m) => m.events);
  }

  getIntents(): GatewayIntentBits[] {
    const seen = new Set<GatewayIntentBits>();
    for (const mod of this.loaded) {
      const intents = mod.instance.intents ?? [];
      for (const intent of intents) {
        seen.add(intent);
      }
    }
    return [...seen];
  }

  async initAll(client: Client): Promise<void> {
    this.client = client;
    for (const mod of this.loaded) {
      if (mod.instance.onInit) {
        await mod.instance.onInit(client);
      }
    }
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
