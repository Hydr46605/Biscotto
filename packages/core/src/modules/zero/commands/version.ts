import type { ChatInputCommandInteraction, Client } from 'discord.js';
import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import type { CommandDefinition } from '../../../contracts/module.contract.ts';

const VERSION = '1.0.0';
const DISCORDJS_VERSION = '14.26.4';
const NODE_VERSION = process.version;

async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
): Promise<void> {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Biscotto v${VERSION}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `**Runtime** ~ Node ${NODE_VERSION}`,
              `**Discord.js** ~ v${DISCORDJS_VERSION}`,
              `**Platform** ~ ${process.platform} ${process.arch}`,
            ].join('\n'),
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(
              'https://raw.githubusercontent.com/Hydr46605/Biscotto/master/assets/cookie.png',
            )
            .setDescription('Biscotto icon'),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '*Freshly baked for your server ~ one biscuit at a time*',
      ),
    );

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export const versionCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('version')
    .setDescription('Show bot version and runtime info'),
  execute,
};
