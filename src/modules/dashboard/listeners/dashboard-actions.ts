import {
  Events,
  MessageFlags,
  type Interaction,
  type ButtonInteraction,
} from 'discord.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import type { EventDefinition } from '../../../contracts/module.contract.ts';
import { COLORS } from '../../../shared/colors.ts';
import { LitLogger } from '../../../kernel/logger.ts';
import { FAV_ID, DETAILS_ID, SEE_ALL_ID } from '../builders/profile-card.ts';

const log = LitLogger.child('dashboard');

function buildEphemeral(title: string, body: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(COLORS.BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}`),
      new TextDisplayBuilder().setContent(body),
    );
}

async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton()) return;

  const btn = interaction as ButtonInteraction;

  switch (btn.customId) {
    case FAV_ID: {
      log.info(`${btn.user.tag} fav'd ${btn.message.interactionMetadata?.user?.tag ?? 'a profile'}`);
      await btn.reply({
        components: [buildEphemeral('⭐', 'Profile added to favorites!')],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
      break;
    }
    case DETAILS_ID: {
      log.info(`${btn.user.tag} requested league details`);
      await btn.reply({
        components: [buildEphemeral(
          '## \ud83c\udfc6 League Details',
          '**Bronze League** \u2014 Rank #22\n\n' +
          '- Next rank: **Silver League**\n' +
          '- XP needed: **190 XP**\n' +
          '- Resets: Every Sunday at midnight',
        )],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
      break;
    }
    case SEE_ALL_ID: {
      log.info(`${btn.user.tag} requested all achievements`);
      await btn.reply({
        components: [buildEphemeral(
          '## \ud83c\udfc5 All Achievements',
          '**4** badges earned\n\n' +
          '- 🏆 First Message\n' +
          '- 💬 Active Chatter (100 msgs)\n' +
          '- 🎉 Event Participant\n' +
          '- ⭐ Community Star',
        )],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
      });
      break;
    }
  }
}

export const dashboardActions: EventDefinition = {
  event: Events.InteractionCreate,
  execute: handleInteraction,
};
