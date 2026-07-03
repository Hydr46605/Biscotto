import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} from 'discord.js';
import { defineCommand } from '../../../kernel/define.js';

const VERSION = '1.0.0';
const DISCORDJS_VERSION = '14.26.4';
const NODE_VERSION = process.version;

export default defineCommand({
  name: 'version',
  description: 'Show bot version and runtime info',
  async execute(ctx) {
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

    await ctx.interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
