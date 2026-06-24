import type {
  Client,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';

export interface CommandDefinition {
  readonly data: SlashCommandBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;
}
