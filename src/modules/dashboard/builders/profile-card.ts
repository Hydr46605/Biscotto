import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '../../../shared/colors.ts';

export const FAV_ID = 'dashboard:fav';
export const DETAILS_ID = 'dashboard:details';
export const SEE_ALL_ID = 'dashboard:see-all';

function progressBar(current: number, max: number, length: number = 20): string {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '\u2589'.repeat(filled) + '\u2591'.repeat(empty);
}

export function buildProfileCard(user: {
  tag: string;
  avatarUrl: string;
  joinDate: string;
  bio: string;
  rank: number;
  xp: number;
  xpMax: number;
  league: string;
  messages: number;
  boostDays: number;
  badges: string[];
}): ContainerBuilder {
  const rankImage = `https://placehold.co/400x200/1a1a2e/ff6b35?text=%23${user.rank}%0A${encodeURIComponent(user.tag.split('#')[0])}%0A${user.xp}/${user.xpMax}+XP`;

  const achievements = new MediaGalleryBuilder().addItems(
    ...user.badges.map((url) =>
      new MediaGalleryItemBuilder().setURL(url),
    ),
  );

  return new ContainerBuilder()
    .setAccentColor(COLORS.BLURPLE)

    // ── Header ──
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# ${user.tag.split('#')[0]}`),
          new TextDisplayBuilder()
            .setContent(`Member \u2022 \ud83d\udc9c ${user.xp} XP`),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(user.avatarUrl)
            .setDescription(user.tag),
        ),
    )

    // ── About Me ──
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('## \ud83d\ude0a About Me'),
      new TextDisplayBuilder()
        .setContent(`> ${user.bio}`),
      new TextDisplayBuilder()
        .setContent(`Part of the community since **${user.joinDate}**`),
    )

    // ── League ──
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## \ud83c\udfc6 ${user.league}`),
          new TextDisplayBuilder()
            .setContent(`Ranked **#${user.rank}** in the community`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(DETAILS_ID)
            .setLabel('Details')
            .setStyle(ButtonStyle.Secondary),
        ),
    )

    // ── Weekly Performance ──
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('## \ud83d\udcaa Weekly Performance'),
      new TextDisplayBuilder()
        .setContent(`**${user.xp} XP** this week`),
    )

    // ── Rank Card ──
    .addMediaGalleryComponents(
      new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(rankImage)
            .setDescription(`Rank #${user.rank}`),
        ),
    )

    // ── Achievements ──
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## \ud83c\udfc5 Latest Achievements'),
          new TextDisplayBuilder()
            .setContent('Recently obtained badges'),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(SEE_ALL_ID)
            .setLabel('See All')
            .setStyle(ButtonStyle.Secondary),
        ),
    )
    .addMediaGalleryComponents(achievements)

    // ── Engagement Stats ──
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## \ud83d\udcca Engagement Stats'),
          new TextDisplayBuilder()
            .setContent(
              `Messages **${user.messages}** \u2022 Boost Days **${user.boostDays}**`,
            ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(FAV_ID)
            .setLabel('Fav Profile')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('\u2b50'),
        ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          `\ud83d\udcac ${user.tag} \u2014 Active Session`,
        ),
    );
}
