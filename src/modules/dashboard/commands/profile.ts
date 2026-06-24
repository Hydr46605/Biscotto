import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { CommandDefinition } from '../../../contracts/module.contract.ts';
import { LitLogger } from '../../../kernel/logger.ts';
import { buildProfileCard } from '../builders/profile-card.ts';

const BADGE_PLACEHOLDERS = [
  'https://placehold.co/120x120/2c2f33/5865f2?text=Badge',
  'https://placehold.co/120x120/2c2f33/57f287?text=Badge',
  'https://placehold.co/120x120/2c2f33/fee75c?text=Badge',
  'https://placehold.co/120x120/2c2f33/ed4245?text=Badge',
];

async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
): Promise<void> {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const member = interaction.guild?.members.cache.get(target.id);

  LitLogger.debug('Dashboard', `Building profile card for ${target.tag}`);

  const card = buildProfileCard({
    tag: target.tag,
    avatarUrl: target.displayAvatarURL({ size: 256, extension: 'png' }),
    joinDate: member
      ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:D>`
      : 'Unknown',
    bio: 'Roar!',
    rank: 22,
    xp: 10,
    xpMax: 200,
    league: 'Bronze League',
    messages: 14,
    boostDays: 0,
    badges: BADGE_PLACEHOLDERS,
  });

  await interaction.reply({
    components: [card],
    flags: MessageFlags.IsComponentsV2,
  });

  LitLogger.info('Dashboard', `Profile card sent for ${target.tag}`);
}

export const profileCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show your user profile dashboard')
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('View another user\'s profile')
        .setRequired(false),
    ) as unknown as SlashCommandBuilder,
  execute,
};
