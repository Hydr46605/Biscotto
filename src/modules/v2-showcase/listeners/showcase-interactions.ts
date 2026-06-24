import {
  Events,
  MessageFlags,
  type Interaction,
  type StringSelectMenuInteraction,
  type ButtonInteraction,
} from 'discord.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import type { EventDefinition } from '../../../contracts/module.contract.ts';
import { COLORS } from '../../../shared/colors.ts';
import { LitLogger } from '../../../kernel/logger.ts';
import { SELECT_ID, BUTTON_ID } from '../builders/showcase-panel.ts';

const log = LitLogger.child('v2-showcase');
const SCOPE = 'v2-showcase';

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  container: '**Container** \u2014 Un box visuale con bordi arrotondati e accent color laterale. Puo\' contenere tutti gli altri componenti.',
  section: '**Section** \u2014 Raggruppa 1-3 TextDisplay con un accessory laterale (thumbnail o button).',
  gallery: '**MediaGallery** \u2014 Mostra una griglia di fino a 10 immagini/media con alt text e spoiler.',
};

function buildFeatureResponse(feature: string): ContainerBuilder {
  const description = FEATURE_DESCRIPTIONS[feature] ?? 'Feature sconosciuta.';
  return new ContainerBuilder()
    .setAccentColor(COLORS.BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`## \ud83d\udd27 Feature: ${feature}`),
      new TextDisplayBuilder()
        .setContent(description),
    );
}

function buildInfoResponse(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(COLORS.GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('## \u2139\ufe0f Info'),
      new TextDisplayBuilder()
        .setContent(
          'Questo bot dimostra **Discord Components V2** con `discord.js` v14.\n\n' +
          '- Usa `/showcase` per vedere tutti i componenti\n' +
          '- Seleziona un\'opzione dal menu per info su quella feature\n' +
          '- Clicca **Info** per questo messaggio',
        ),
    );
}

async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isStringSelectMenu() && interaction.customId === SELECT_ID) {
    const selected = (interaction as StringSelectMenuInteraction).values[0];
    log.info(`User ${interaction.user.tag} selected feature: ${selected}`);

    const container = buildFeatureResponse(selected);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === BUTTON_ID) {
    log.info(`User ${interaction.user.tag} clicked Info button`);

    const container = buildInfoResponse();

    await (interaction as ButtonInteraction).reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true,
    });
  }
}

export const showcaseInteractions: EventDefinition = {
  event: Events.InteractionCreate,
  execute: handleInteraction,
};
