import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { CommandDefinition } from '../../../contracts/module.contract.ts';

async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
): Promise<void> {
  await interaction.reply({
    content: 'Pong!',
    flags: MessageFlags.IsComponentsV2,
  });
}

export const pingCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot responsiveness'),
  execute,
};
