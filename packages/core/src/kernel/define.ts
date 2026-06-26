import type {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Events,
  GatewayIntentBits,
} from 'discord.js';
import {
  SlashCommandBuilder as SlashCommandBuilderClass,
  MessageFlags,
} from 'discord.js';
import type { CommandDefinition, EventDefinition, ModuleManifest, BiscottoModule } from '../contracts/module.contract.ts';

// ── Command Context ──────────────────────────────────────────────────────────

export interface CommandContext {
  readonly interaction: ChatInputCommandInteraction;
  readonly client: Client;
  reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
  defer(options?: { ephemeral?: boolean }): Promise<void>;
}

function createCommandContext(
  interaction: ChatInputCommandInteraction,
  client: Client,
): CommandContext {
  return {
    interaction,
    client,
    async reply(content, options) {
      await interaction.reply({
        content,
        flags: options?.ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    },
    async defer(options) {
      await interaction.deferReply({
        flags: options?.ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    },
  };
}

// ── Command Config ───────────────────────────────────────────────────────────

export interface CommandConfig {
  name: string;
  description: string;
  execute: (ctx: CommandContext) => Promise<void>;
}

// ── defineCommand ────────────────────────────────────────────────────────────

export function defineCommand(config: CommandConfig): CommandDefinition {
  const builder = new SlashCommandBuilderClass()
    .setName(config.name)
    .setDescription(config.description);

  return {
    data: builder,
    async execute(interaction, client) {
      const ctx = createCommandContext(interaction, client);
      await config.execute(ctx);
    },
  };
}

// ── Event Config ─────────────────────────────────────────────────────────────

export interface EventConfig {
  event: Events;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}

// ── defineEvent ──────────────────────────────────────────────────────────────

export function defineEvent(config: EventConfig): EventDefinition {
  return {
    event: config.event,
    once: config.once ?? false,
    execute: config.execute,
  };
}

// ── Module Config ────────────────────────────────────────────────────────────

export interface ModuleConfig {
  manifest: ModuleManifest;
  intents?: GatewayIntentBits[];
  commands?: CommandDefinition[];
  events?: EventDefinition[];
  onInit?(client: Client): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
}

// ── defineModule ─────────────────────────────────────────────────────────────

export function defineModule(config: ModuleConfig): BiscottoModule & { intents: GatewayIntentBits[] } {
  return {
    manifest: config.manifest,
    intents: config.intents ?? [],
    register() {
      return {
        commands: config.commands ?? [],
        events: config.events ?? [],
      };
    },
    onInit: config.onInit,
    onDestroy: config.onDestroy,
  };
}
