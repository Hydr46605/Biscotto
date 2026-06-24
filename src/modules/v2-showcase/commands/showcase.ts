import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { SlashCommandBuilder, MessageFlags, AttachmentBuilder } from 'discord.js';
import type { CommandDefinition } from '../../../contracts/module.contract.ts';
import { LitLogger } from '../../../kernel/logger.ts';
import { buildShowcasePanel, FILE_NAME } from '../builders/showcase-panel.ts';

const log = LitLogger.child('v2-showcase');

async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
): Promise<void> {
  log.debug(`Building showcase panel for ${interaction.user.tag}`);

  const panel = buildShowcasePanel();

  const payload = {
    module: 'v2-showcase',
    version: '1.0.0',
    components: [
      'Container',
      'TextDisplay',
      'Separator',
      'Section',
      'Thumbnail',
      'MediaGallery',
      'ActionRow',
      'Button',
      'StringSelectMenu',
      'File',
    ],
    timestamp: new Date().toISOString(),
  };

  const file = new AttachmentBuilder(
    Buffer.from(JSON.stringify(payload, null, 2)),
    { name: FILE_NAME },
  );

  await interaction.reply({
    components: [panel],
    files: [file],
    flags: MessageFlags.IsComponentsV2,
  });

  log.info(`Showcase panel sent to ${interaction.user.tag}`);
}

export const showcaseCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('showcase')
    .setDescription('Demonstrates all Discord Components V2 features'),
  execute,
};
