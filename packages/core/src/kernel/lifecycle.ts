import type { Client } from 'discord.js';
import { LitLogger } from './logger.js';
import type { ServiceRegistry } from './services.js';
import type { ModuleData } from './data.js';
import type { StorageProvider } from './storage/types.js';

// ── Module State ──────────────────────────────────────────────────────────────

export enum ModuleState {
  DISCOVERED = 'discovered',
  LOADED = 'loaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  UNLOADED = 'unloaded',
}

// ── Lifecycle Context ─────────────────────────────────────────────────────────

export interface ModuleContext {
  readonly client: Client;
  readonly services: ServiceRegistry;
  readonly data: ModuleData;
  readonly storage: StorageProvider;
  readonly logger: ModuleLogger;
}

export interface ModuleLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

function createModuleLogger(moduleName: string): ModuleLogger {
  return {
    info: (msg) => LitLogger.info(moduleName, msg),
    warn: (msg) => LitLogger.warn(moduleName, msg),
    error: (msg) => LitLogger.error(moduleName, msg),
    debug: (msg) => LitLogger.debug(moduleName, msg),
  };
}

// ── Lifecycle Hooks ───────────────────────────────────────────────────────────

// `LifecycleHooks` is defined in `define.ts` (next to `ModuleConfig`) so
// that user-facing module definition and runtime API share one type.
// Imported here as a type-only reference to avoid a runtime cycle.

import type { LifecycleHooks } from './define.js';

// ── Lifecycle Manager ─────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ModuleState, ModuleState[]> = {
  [ModuleState.DISCOVERED]: [ModuleState.LOADED, ModuleState.ERROR],
  [ModuleState.LOADED]: [ModuleState.ENABLED, ModuleState.DISABLED, ModuleState.ERROR],
  [ModuleState.ENABLED]: [ModuleState.DISABLED, ModuleState.ERROR],
  [ModuleState.DISABLED]: [ModuleState.ENABLED, ModuleState.ERROR, ModuleState.UNLOADED],
  [ModuleState.ERROR]: [ModuleState.LOADED, ModuleState.DISCOVERED],
  [ModuleState.UNLOADED]: [],
};

export class ModuleLifecycle {
  private states = new Map<string, ModuleState>();
  private hooks = new Map<string, LifecycleHooks>();
  private client: Client | null = null;
  private services: ServiceRegistry | null = null;
  private moduleData = new Map<string, ModuleData>();
  private moduleStorage = new Map<string, StorageProvider>();

  setClient(client: Client): void {
    this.client = client;
  }

  setServices(services: ServiceRegistry): void {
    this.services = services;
  }

  setModuleData(name: string, data: ModuleData): void {
    this.moduleData.set(name, data);
  }

  setModuleStorage(name: string, storage: StorageProvider): void {
    this.moduleStorage.set(name, storage);
  }

  /**
   * Register lifecycle hooks for a module.
   */
  register(name: string, hooks: LifecycleHooks): void {
    this.hooks.set(name, hooks);
    if (!this.states.has(name)) {
      this.states.set(name, ModuleState.DISCOVERED);
    }
  }

  /**
   * Get current state of a module.
   */
  getState(name: string): ModuleState {
    return this.states.get(name) ?? ModuleState.DISCOVERED;
  }

  /**
   * Transition a module to a new state, running hooks.
   */
  async transition(name: string, target: ModuleState): Promise<boolean> {
    const current = this.states.get(name) ?? ModuleState.DISCOVERED;
    const valid = VALID_TRANSITIONS[current];

    if (!valid.includes(target)) {
      LitLogger.warn('Lifecycle', `Invalid transition: ${name} ${current} → ${target}`);
      return false;
    }

    try {
      await this.runHooks(name, current, target);
      this.states.set(name, target);
      LitLogger.debug('Lifecycle', `${name}: ${current} → ${target}`);
      return true;
    } catch (error) {
      this.states.set(name, ModuleState.ERROR);
      LitLogger.error('Lifecycle', `${name} transition failed: ${error}`);
      return false;
    }
  }

  /**
   * Run the appropriate hook for a transition.
   */
  private async runHooks(
    name: string,
    from: ModuleState,
    to: ModuleState,
  ): Promise<void> {
    const hooks = this.hooks.get(name);
    if (!hooks) return;

    if (!this.client) {
      throw new Error('Client not set on ModuleLifecycle');
    }

    const data = this.moduleData.get(name);
    const storage = this.moduleStorage.get(name);

    if (!data || !storage) {
      throw new Error(`ModuleData or StorageProvider not set for ${name}`);
    }

    const ctx: ModuleContext = {
      client: this.client,
      services: this.services!,
      data,
      storage,
      logger: createModuleLogger(name),
    };

    if (to === ModuleState.LOADED && hooks.onLoad) {
      await hooks.onLoad(ctx);
    } else if (to === ModuleState.ENABLED && hooks.onEnable) {
      await hooks.onEnable(ctx);
    } else if (to === ModuleState.DISABLED && hooks.onDisable) {
      await hooks.onDisable(ctx);
    } else if (to === ModuleState.UNLOADED && hooks.onUnload) {
      await hooks.onUnload(ctx);
    }
  }

  /**
   * Transition to enabled (shortcut).
   */
  async enable(name: string): Promise<boolean> {
    const current = this.getState(name);
    if (current === ModuleState.ENABLED) return true;

    if (current === ModuleState.DISCOVERED) {
      const loaded = await this.transition(name, ModuleState.LOADED);
      if (!loaded) return false;
    }

    return this.transition(name, ModuleState.ENABLED);
  }

  /**
   * Transition to disabled (shortcut).
   */
  async disable(name: string): Promise<boolean> {
    return this.transition(name, ModuleState.DISABLED);
  }

  /**
   * Full unload sequence.
   */
  async unload(name: string): Promise<boolean> {
    const current = this.getState(name);
    if (current === ModuleState.ENABLED) {
      const disabled = await this.disable(name);
      if (!disabled) return false;
    }
    return this.transition(name, ModuleState.UNLOADED);
  }

  /**
   * Get all module states.
   */
  getAll(): Map<string, ModuleState> {
    return new Map(this.states);
  }

  /**
   * Remove a module from tracking.
   */
  remove(name: string): void {
    this.states.delete(name);
    this.hooks.delete(name);
    this.moduleData.delete(name);
    this.moduleStorage.delete(name);
  }
}
