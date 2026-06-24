import type {
  Client,
  Events,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';

export interface ModuleManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: string[];
}

export interface CommandDefinition {
  readonly data: SlashCommandBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
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
  readonly events?: EventDefinition[];
}

export interface HydrottoModule {
  readonly manifest: ModuleManifest;
  register(): ModuleRegistration;
  onInit?(client: Client): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
}
