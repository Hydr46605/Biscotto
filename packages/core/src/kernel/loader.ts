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
import { ServiceRegistry } from './services.ts';
import { ModuleLifecycle, ModuleState, type ModuleContext } from './lifecycle.ts';
import { ModuleData } from './data.ts';
import { ModuleStorageManager } from './storage/manager.ts';
import type { StorageProvider } from './storage/types.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoadedModule {
  instance: BiscottoModule & { intents?: GatewayIntentBits[] };
  commands: CommandDefinition[];
  buttons: ButtonDefinition[];
  selectMenus: SelectMenuDefinition[];
  modals: ModalDefinition[];
  autocompletes: AutocompleteDefinition[];
  userContextMenus: UserContextMenuDefinition[];
  messageContextMenus: MessageContextMenuDefinition[];
  events: EventDefinition[];
  state: ModuleState;
}

type ModuleLike = BiscottoModule & { intents?: GatewayIntentBits[] };

// ── Module Loader ─────────────────────────────────────────────────────────────

export class ModuleLoader {
  private loaded: LoadedModule[] = [];
  private client: Client | null = null;
  private services = new ServiceRegistry();
  private lifecycle = new ModuleLifecycle();
  private storageManager = new ModuleStorageManager();
  private root: string | null = null;

  // ── Public API ────────────────────────────────────────────────────────────

  async loadAll(modules: ModuleLike[], client?: Client, root?: string): Promise<void> {
    if (client) this.client = client;
    if (root) this.root = root;

    LitLogger.info('Loader', `Discovering ${modules.length} module(s)...`);

    for (const mod of modules) {
      await this.load(mod);
    }

    this.logSummary();
  }

  getCommands(): CommandDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.commands);
  }

  getButtons(): ButtonDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.buttons);
  }

  getSelectMenus(): SelectMenuDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.selectMenus);
  }

  getModals(): ModalDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.modals);
  }

  getAutocompletes(): AutocompleteDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.autocompletes);
  }

  getUserContextMenus(): UserContextMenuDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.userContextMenus);
  }

  getMessageContextMenus(): MessageContextMenuDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.messageContextMenus);
  }

  getEvents(): EventDefinition[] {
    return this.loaded
      .filter((m) => m.state === ModuleState.ENABLED)
      .flatMap((m) => m.events);
  }

  getIntents(): GatewayIntentBits[] {
    const seen = new Set<GatewayIntentBits>();
    for (const mod of this.loaded) {
      if (mod.state !== ModuleState.ENABLED) continue;
      const intents = mod.instance.intents ?? [];
      for (const intent of intents) {
        seen.add(intent);
      }
    }
    return [...seen];
  }

  async initAll(client: Client): Promise<void> {
    this.client = client;
    this.lifecycle.setClient(client);
    this.lifecycle.setServices(this.services);

    for (const mod of this.loaded) {
      if (mod.state !== ModuleState.ENABLED) continue;

      // Run onInit (legacy)
      if (mod.instance.onInit) {
        await mod.instance.onInit(client);
      }
    }
  }

  async destroyAll(): Promise<void> {
    LitLogger.info('Loader', 'Destroying all modules...');
    for (const mod of this.loaded) {
      await this.unloadModule(mod);
    }
    this.loaded = [];
    this.services.clear();
    await this.storageManager.closeAll();
  }

  /**
   * Initialize MySQL if any module needs it.
   */
  async initMysql(config: { host: string; port: number; user: string; password: string; database: string }): Promise<void> {
    await this.storageManager.initMysql(config);
  }

  // ── Lifecycle Control ─────────────────────────────────────────────────────

  async enableModule(name: string): Promise<boolean> {
    const mod = this.loaded.find((m) => m.instance.manifest.name === name);
    if (!mod) {
      LitLogger.error('Loader', `Module "${name}" not found`);
      return false;
    }

    if (mod.state === ModuleState.ENABLED) {
      LitLogger.warn('Loader', `Module "${name}" is already enabled`);
      return true;
    }

    const success = await this.lifecycle.enable(name);
    if (success) {
      mod.state = this.lifecycle.getState(name);
      LitLogger.info('Loader', `Enabled module: ${name}`);
    }
    return success;
  }

  async disableModule(name: string): Promise<boolean> {
    const mod = this.loaded.find((m) => m.instance.manifest.name === name);
    if (!mod) {
      LitLogger.error('Loader', `Module "${name}" not found`);
      return false;
    }

    if (mod.state === ModuleState.DISABLED) {
      LitLogger.warn('Loader', `Module "${name}" is already disabled`);
      return true;
    }

    const removedServices = this.services.removeByProvider(name);
    if (removedServices.length > 0) {
      LitLogger.debug('Loader', `Removed services from ${name}: ${removedServices.join(', ')}`);
    }

    const success = await this.lifecycle.disable(name);
    if (success) {
      mod.state = ModuleState.DISABLED;
      LitLogger.info('Loader', `Disabled module: ${name}`);
    }
    return success;
  }

  async reloadModule(name: string): Promise<boolean> {
    const disabled = await this.disableModule(name);
    if (!disabled) return false;
    return this.enableModule(name);
  }

  async unloadModuleByName(name: string): Promise<boolean> {
    const mod = this.loaded.find((m) => m.instance.manifest.name === name);
    if (!mod) return false;

    await this.unloadModule(mod);
    this.loaded = this.loaded.filter((m) => m !== mod);
    this.lifecycle.remove(name);
    return true;
  }

  async loadModule(mod: ModuleLike): Promise<boolean> {
    return this.load(mod);
  }

  getServices(): ServiceRegistry {
    return this.services;
  }

  getLifecycle(): ModuleLifecycle {
    return this.lifecycle;
  }

  getStorageManager(): ModuleStorageManager {
    return this.storageManager;
  }

  getModuleStates(): Map<string, ModuleState> {
    return this.lifecycle.getAll();
  }

  getModuleInfo(name: string): LoadedModule | undefined {
    return this.loaded.find((m) => m.instance.manifest.name === name);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async load(mod: ModuleLike): Promise<boolean> {
    const { manifest } = mod;

    // Check dependencies
    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (!this.loaded.some((m) => m.instance.manifest.name === dep)) {
          LitLogger.error('Loader', `Module "${manifest.name}" requires "${dep}" which is not loaded`);
          return false;
        }
      }
    }

    try {
      const registration = mod.register();
      const loaded: LoadedModule = {
        instance: mod,
        commands: registration.commands ?? [],
        buttons: registration.buttons ?? [],
        selectMenus: registration.selectMenus ?? [],
        modals: registration.modals ?? [],
        autocompletes: registration.autocompletes ?? [],
        userContextMenus: registration.userContextMenus ?? [],
        messageContextMenus: registration.messageContextMenus ?? [],
        events: registration.events ?? [],
        state: ModuleState.LOADED,
      };

      this.loaded.push(loaded);

      // Register lifecycle hooks
      this.lifecycle.register(manifest.name, {
        onLoad: mod.onLoad as any,
        onEnable: mod.onEnable as any,
        onDisable: mod.onDisable as any,
        onUnload: mod.onUnload as any,
      });

      // Transition to enabled
      await this.lifecycle.enable(manifest.name);
      loaded.state = this.lifecycle.getState(manifest.name);

      // Log module info
      this.logModule(manifest, loaded);

      return true;
    } catch (error) {
      LitLogger.error('Loader', `Failed to load module "${manifest.name}": ${error}`);
      return false;
    }
  }

  /**
   * Setup per-module data and storage. Called after root is known.
   */
  async setupModuleData(mod: ModuleLike): Promise<void> {
    if (!this.root) throw new Error('Root not set');

    const { manifest } = mod;
    const name = manifest.name;

    // Create ModuleData (config + files)
    const data = new ModuleData(this.root, name);
    this.lifecycle.setModuleData(name, data);

    // Create isolated storage
    const storageConfig = manifest.storage ?? { driver: 'json' as const };
    const storage = await this.storageManager.createModuleStorage(this.root, name, storageConfig);
    this.lifecycle.setModuleStorage(name, storage);
  }

  private async unloadModule(mod: LoadedModule): Promise<void> {
    const name = mod.instance.manifest.name;

    // Remove services
    this.services.removeByProvider(name);

    // Run onDisable + onUnload
    if (mod.state === ModuleState.ENABLED) {
      await this.lifecycle.disable(name);
    }
    await this.lifecycle.unload(name);

    // Close module storage
    await this.storageManager.closeModule(name);

    // Run legacy onDestroy
    if (mod.instance.onDestroy) {
      await mod.instance.onDestroy();
    }

    LitLogger.debug('Loader', `Unloaded: ${name}`);
  }

  private logModule(manifest: ModuleManifest, loaded: LoadedModule): void {
    const desc = manifest.description ? ` - ${manifest.description}` : '';
    LitLogger.tree('Loader', '|-', `${manifest.name} v${manifest.version}${desc}`);

    if (manifest.storage) {
      LitLogger.tree('Loader', '| ', `Storage: ${manifest.storage.driver}`, 'debug');
    }
    if (manifest.provides && manifest.provides.length > 0) {
      LitLogger.tree('Loader', '| ', `Provides: ${manifest.provides.join(', ')}`, 'debug');
    }
    if (manifest.requires && manifest.requires.length > 0) {
      LitLogger.tree('Loader', '| ', `Requires: ${manifest.requires.join(', ')}`, 'debug');
    }
    if (loaded.commands.length > 0) {
      LitLogger.tree('Loader', '| ', `Commands: ${loaded.commands.map((c) => c.data.name).join(', ')}`, 'debug');
    }
    if (loaded.buttons.length > 0) {
      LitLogger.tree('Loader', '| ', `Buttons: ${loaded.buttons.map((b) => b.customId).join(', ')}`, 'debug');
    }
    if (loaded.selectMenus.length > 0) {
      LitLogger.tree('Loader', '| ', `SelectMenus: ${loaded.selectMenus.map((m) => m.customId).join(', ')}`, 'debug');
    }
    if (loaded.modals.length > 0) {
      LitLogger.tree('Loader', '| ', `Modals: ${loaded.modals.map((m) => m.customId).join(', ')}`, 'debug');
    }
    if (loaded.events.length > 0) {
      LitLogger.tree('Loader', '| ', `Events: ${loaded.events.map((e) => e.event).join(', ')}`, 'debug');
    }
  }

  private logSummary(): void {
    const totalCmds = this.loaded.reduce((a, m) => a + m.commands.length, 0);
    const totalBtns = this.loaded.reduce((a, m) => a + m.buttons.length, 0);
    const totalMenus = this.loaded.reduce((a, m) => a + m.selectMenus.length, 0);
    const totalModals = this.loaded.reduce((a, m) => a + m.modals.length, 0);
    const totalEvents = this.loaded.reduce((a, m) => a + m.events.length, 0);
    const total = totalCmds + totalBtns + totalMenus + totalModals + totalEvents;
    LitLogger.info('Loader', `Loaded ${this.loaded.length} module(s) — ${total} interaction(s)`);
  }
}

// Re-export types for external use
import type { ModuleManifest } from '../contracts/module.contract.ts';
