import type {
  Client,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AnySelectMenuInteraction,
  ModalSubmitInteraction,
  AutocompleteInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  Events,
  GatewayIntentBits,
  TextInputBuilder,
} from 'discord.js';
import {
  SlashCommandBuilder as SlashCommandBuilderClass,
  MessageFlags,
} from 'discord.js';
import type {
  CommandDefinition,
  ButtonDefinition,
  SelectMenuDefinition,
  ModalDefinition,
  AutocompleteDefinition,
  UserContextMenuDefinition,
  MessageContextMenuDefinition,
  EventDefinition,
  ModuleManifest,
  BiscottoModuleWithIntents,
} from '../contracts/module.contract.js';
import type { ModuleContext } from './lifecycle.js';

// ── Shared Helpers ────────────────────────────────────────────────────────────

function ephemeralFlags(ephemeral?: boolean): MessageFlags.Ephemeral | undefined {
  return ephemeral ? MessageFlags.Ephemeral : undefined;
}

// ── Command ──────────────────────────────────────────────────────────────────

export interface CommandContext {
  readonly interaction: ChatInputCommandInteraction;
  readonly client: Client;
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

export interface CommandConfig {
  name: string;
  description: string;
  cooldown?: number;
  permissions?: string[];
  execute: (ctx: CommandContext) => Promise<void>;
}

function createCommandContext(
  interaction: ChatInputCommandInteraction,
  client: Client,
): CommandContext {
  return {
    interaction,
    client,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
    async defer(options) {
      await interaction.deferReply({ flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineCommand(config: CommandConfig): CommandDefinition {
  const builder = new SlashCommandBuilderClass()
    .setName(config.name)
    .setDescription(config.description);

  return {
    data: builder,
    cooldown: config.cooldown,
    permissions: config.permissions,
    async execute(interaction, client) {
      await config.execute(createCommandContext(interaction, client));
    },
  };
}

// ── Button ───────────────────────────────────────────────────────────────────

export interface ButtonContext {
  readonly interaction: ButtonInteraction;
  readonly client: Client;
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

export interface ButtonConfig {
  customId: string;
  cooldown?: number;
  permissions?: string[];
  execute: (ctx: ButtonContext) => Promise<void>;
}

function createButtonContext(
  interaction: ButtonInteraction,
  client: Client,
): ButtonContext {
  return {
    interaction,
    client,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
    async defer(options) {
      await interaction.deferReply({ flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineButton(config: ButtonConfig): ButtonDefinition {
  return {
    customId: config.customId,
    cooldown: config.cooldown,
    permissions: config.permissions,
    async execute(interaction, client) {
      await config.execute(createButtonContext(interaction, client));
    },
  };
}

// ── Select Menu ──────────────────────────────────────────────────────────────

export interface SelectMenuContext {
  readonly interaction: AnySelectMenuInteraction;
  readonly client: Client;
  readonly values: string[];
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

export interface SelectMenuConfig {
  customId: string;
  cooldown?: number;
  permissions?: string[];
  execute: (ctx: SelectMenuContext) => Promise<void>;
}

function createSelectMenuContext(
  interaction: AnySelectMenuInteraction,
  client: Client,
): SelectMenuContext {
  return {
    interaction,
    client,
    values: interaction.values,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
    async defer(options) {
      await interaction.deferReply({ flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineSelectMenu(config: SelectMenuConfig): SelectMenuDefinition {
  return {
    customId: config.customId,
    cooldown: config.cooldown,
    permissions: config.permissions,
    async execute(interaction, client) {
      await config.execute(createSelectMenuContext(interaction, client));
    },
  };
}

// ── Modal ────────────────────────────────────────────────────────────────────

export interface ModalContext {
  readonly interaction: ModalSubmitInteraction;
  readonly client: Client;
  readonly fields: ModalSubmitInteraction['fields'];
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
}

export interface ModalConfig {
  customId: string;
  execute: (ctx: ModalContext) => Promise<void>;
}

function createModalContext(
  interaction: ModalSubmitInteraction,
  client: Client,
): ModalContext {
  return {
    interaction,
    client,
    fields: interaction.fields,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineModal(config: ModalConfig): ModalDefinition {
  return {
    customId: config.customId,
    async execute(interaction, client) {
      await config.execute(createModalContext(interaction, client));
    },
  };
}

// ── Autocomplete ─────────────────────────────────────────────────────────────

export interface AutocompleteContext {
  readonly interaction: AutocompleteInteraction;
  readonly client: Client;
  respond(options: { name: string; value: string }[]): Promise<void>;
}

export interface AutocompleteConfig {
  name: string;
  execute: (ctx: AutocompleteContext) => Promise<void>;
}

function createAutocompleteContext(
  interaction: AutocompleteInteraction,
  client: Client,
): AutocompleteContext {
  return {
    interaction,
    client,
    async respond(options) {
      await interaction.respond(options);
    },
  };
}

export function defineAutocomplete(config: AutocompleteConfig): AutocompleteDefinition {
  return {
    name: config.name,
    async execute(interaction, client) {
      await config.execute(createAutocompleteContext(interaction, client));
    },
  };
}

// ── Context Menu (User) ──────────────────────────────────────────────────────

export interface UserContextMenuContext {
  readonly interaction: UserContextMenuCommandInteraction;
  readonly client: Client;
  readonly targetUser: UserContextMenuCommandInteraction['targetUser'];
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

export interface UserContextMenuConfig {
  name: string;
  cooldown?: number;
  permissions?: string[];
  execute: (ctx: UserContextMenuContext) => Promise<void>;
}

function createUserContextMenuContext(
  interaction: UserContextMenuCommandInteraction,
  client: Client,
): UserContextMenuContext {
  return {
    interaction,
    client,
    targetUser: interaction.targetUser,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
    async defer(options) {
      await interaction.deferReply({ flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineUserContextMenu(config: UserContextMenuConfig): UserContextMenuDefinition {
  return {
    name: config.name,
    cooldown: config.cooldown,
    permissions: config.permissions,
    async execute(interaction, client) {
      await config.execute(createUserContextMenuContext(interaction, client));
    },
  };
}

// ── Context Menu (Message) ───────────────────────────────────────────────────

export interface MessageContextMenuContext {
  readonly interaction: MessageContextMenuCommandInteraction;
  readonly client: Client;
  readonly targetMessage: MessageContextMenuCommandInteraction['targetMessage'];
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

export interface MessageContextMenuConfig {
  name: string;
  cooldown?: number;
  permissions?: string[];
  execute: (ctx: MessageContextMenuContext) => Promise<void>;
}

function createMessageContextMenuContext(
  interaction: MessageContextMenuCommandInteraction,
  client: Client,
): MessageContextMenuContext {
  return {
    interaction,
    client,
    targetMessage: interaction.targetMessage,
    async reply(content, options) {
      await interaction.reply({ content, flags: ephemeralFlags(options?.ephemeral) });
    },
    async defer(options) {
      await interaction.deferReply({ flags: ephemeralFlags(options?.ephemeral) });
    },
  };
}

export function defineMessageContextMenu(config: MessageContextMenuConfig): MessageContextMenuDefinition {
  return {
    name: config.name,
    cooldown: config.cooldown,
    permissions: config.permissions,
    async execute(interaction, client) {
      await config.execute(createMessageContextMenuContext(interaction, client));
    },
  };
}

// ── Event ────────────────────────────────────────────────────────────────────

export interface EventConfig {
  event: Events;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}

export function defineEvent(config: EventConfig): EventDefinition {
  return {
    event: config.event,
    once: config.once ?? false,
    execute: config.execute,
  };
}

// ── Module ───────────────────────────────────────────────────────────────────

export interface ModuleConfig {
  manifest: ModuleManifest;
  intents?: GatewayIntentBits[];
  commands?: CommandDefinition[];
  buttons?: ButtonDefinition[];
  selectMenus?: SelectMenuDefinition[];
  modals?: ModalDefinition[];
  autocompletes?: AutocompleteDefinition[];
  userContextMenus?: UserContextMenuDefinition[];
  messageContextMenus?: MessageContextMenuDefinition[];
  events?: EventDefinition[];
  onInit?(client: Client): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
  onLoad?(ctx: ModuleContext): Promise<void> | void;
  onEnable?(ctx: ModuleContext): Promise<void> | void;
  onDisable?(ctx: ModuleContext): Promise<void> | void;
  onUnload?(ctx: ModuleContext): Promise<void> | void;
}

/**
 * Concrete lifecycle-hook shape used by `ModuleLifecycle`. Defined here
 * (next to `ModuleConfig`) so module authors see the same typed shape that
 * the runtime invokes.
 */
export interface LifecycleHooks {
  /** Module loaded — initialize resources (DB, cache, etc.) */
  onLoad?(ctx: ModuleContext): Promise<void> | void;
  /** Module enabled — register commands/events */
  onEnable?(ctx: ModuleContext): Promise<void> | void;
  /** Module disabled — cleanup resources */
  onDisable?(ctx: ModuleContext): Promise<void> | void;
  /** Module unloaded — final cleanup */
  onUnload?(ctx: ModuleContext): Promise<void> | void;
}

export function defineModule(config: ModuleConfig): BiscottoModuleWithIntents {
  return {
    manifest: config.manifest,
    intents: config.intents ?? [],
    register() {
      return {
        commands: config.commands ?? [],
        buttons: config.buttons ?? [],
        selectMenus: config.selectMenus ?? [],
        modals: config.modals ?? [],
        autocompletes: config.autocompletes ?? [],
        userContextMenus: config.userContextMenus ?? [],
        messageContextMenus: config.messageContextMenus ?? [],
        events: config.events ?? [],
      };
    },
    onInit: config.onInit,
    onDestroy: config.onDestroy,
    onLoad: config.onLoad,
    onEnable: config.onEnable,
    onDisable: config.onDisable,
    onUnload: config.onUnload,
  } as BiscottoModuleWithIntents;
}
