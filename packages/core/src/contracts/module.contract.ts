import type {
  Client,
  Events,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AnySelectMenuInteraction,
  ModalSubmitInteraction,
  AutocompleteInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  GatewayIntentBits,
} from 'discord.js';
import type { ConfigSchema } from '../kernel/module-config.ts';
import type { StorageDriver } from '../kernel/storage/types.ts';

// ── Module Manifest ───────────────────────────────────────────────────────────

export interface ModuleAuthor {
  readonly name: string;
  readonly url?: string;
}

export interface ModuleManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: ModuleAuthor;
  readonly entry?: string;
  readonly build?: string;
  readonly engine?: string;
  readonly dependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly requires?: string[];
  readonly provides?: string[];
  readonly storage?: { driver: StorageDriver };
  readonly config?: ConfigSchema;
  readonly repository?: string;
  readonly license?: string;
  readonly tags?: string[];
}

/**
 * Raw biscotto.json shape as it appears on disk.
 * Identical to ModuleManifest but represents the deserialized JSON.
 */
export type BiscottoManifest = ModuleManifest;

// ── Module Registration ───────────────────────────────────────────────────────

export interface MiddlewareOptions {
  readonly cooldown?: number;
  readonly permissions?: string[];
}

export interface CommandDefinition extends MiddlewareOptions {
  readonly data: SlashCommandBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;
}

export interface ButtonDefinition extends MiddlewareOptions {
  readonly customId: string;
  execute(
    interaction: ButtonInteraction,
    client: Client,
  ): Promise<void>;
}

export interface SelectMenuDefinition extends MiddlewareOptions {
  readonly customId: string;
  execute(
    interaction: AnySelectMenuInteraction,
    client: Client,
  ): Promise<void>;
}

export interface ModalDefinition {
  readonly customId: string;
  execute(
    interaction: ModalSubmitInteraction,
    client: Client,
  ): Promise<void>;
}

export interface AutocompleteDefinition {
  readonly name: string;
  execute(
    interaction: AutocompleteInteraction,
    client: Client,
  ): Promise<void>;
}

export interface UserContextMenuDefinition extends MiddlewareOptions {
  readonly name: string;
  execute(
    interaction: UserContextMenuCommandInteraction,
    client: Client,
  ): Promise<void>;
}

export interface MessageContextMenuDefinition extends MiddlewareOptions {
  readonly name: string;
  execute(
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<void>;
}

export interface EventDefinition {
  readonly event: Events;
  readonly once?: boolean;
  execute(...args: unknown[]): Promise<void>;
}

export interface ModuleRegistration {
  readonly commands?: CommandDefinition[];
  readonly buttons?: ButtonDefinition[];
  readonly selectMenus?: SelectMenuDefinition[];
  readonly modals?: ModalDefinition[];
  readonly autocompletes?: AutocompleteDefinition[];
  readonly userContextMenus?: UserContextMenuDefinition[];
  readonly messageContextMenus?: MessageContextMenuDefinition[];
  readonly events?: EventDefinition[];
}

// ── Module Interface ──────────────────────────────────────────────────────────

export interface BiscottoModule {
  readonly manifest: ModuleManifest;
  register(): ModuleRegistration;
  onInit?(client: Client): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
  onLoad?(ctx: unknown): Promise<void> | void;
  onEnable?(ctx: unknown): Promise<void> | void;
  onDisable?(ctx: unknown): Promise<void> | void;
  onUnload?(ctx: unknown): Promise<void> | void;
}

export interface BiscottoModuleWithIntents extends BiscottoModule {
  readonly intents: GatewayIntentBits[];
}
