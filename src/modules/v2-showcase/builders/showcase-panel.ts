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
  StringSelectMenuBuilder,
  FileBuilder,
} from 'discord.js';
import { COLORS } from '../../../shared/colors.ts';

export const SELECT_ID = 'v2-showcase:select';
export const BUTTON_ID = 'v2-showcase:info';
export const FILE_NAME = 'showcase-data.json';

export function buildShowcasePanel(): ContainerBuilder {
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(SELECT_ID)
        .setPlaceholder('Scegli una feature...')
        .addOptions(
          {
            label: 'Container',
            description: 'Box con accent color e bordi arrotondati',
            value: 'container',
            emoji: '\ud83d\udce6',
          },
          {
            label: 'Section',
            description: 'Testo con accessorio laterale (thumbnail/button)',
            value: 'section',
            emoji: '\ud83d\udcc4',
          },
          {
            label: 'MediaGallery',
            description: 'Griglia di immagini e media',
            value: 'gallery',
            emoji: '\ud83d\uddbc\ufe0f',
          },
        ),
    );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_ID)
        .setLabel('Info')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('\u2139\ufe0f'),
    );

  const thumbnailSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('### \ud83d\uddbc\ufe0f Section + Thumbnail'),
      new TextDisplayBuilder()
        .setContent(
          'Una **Section** puo\' avere un accessory laterale. ' +
          'Qui c\'e\' un\'immagine come thumbnail.',
        ),
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('https://picsum.photos/seed/hydrotto/200/200')
        .setDescription('Thumbnail di esempio'),
    );

  const gallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('https://picsum.photos/seed/v2demo1/400/200')
        .setDescription('Immagine 1'),
      new MediaGalleryItemBuilder()
        .setURL('https://picsum.photos/seed/v2demo2/400/200')
        .setDescription('Immagine 2'),
    );

  return new ContainerBuilder()
    .setAccentColor(COLORS.BLURPLE)
    // Title
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('# \ud83c\udfa8 Components V2 Showcase'),
      new TextDisplayBuilder()
        .setContent('Tutto in un singolo container. **Niente embeds.** Solo componenti.'),
    )
    // Divider
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    // Feature list
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('## \ud83d\udccb Struttura del messaggio'),
      new TextDisplayBuilder()
        .setContent(
          '- **Container** con accent color\n' +
          '- **TextDisplay** per markdown\n' +
          '- **Separator** per divisori\n' +
          '- **Section** con thumbnail e button\n' +
          '- **MediaGallery** per griglie di immagini\n' +
          '- **ActionRow** con button e select menu\n' +
          '- **File** per allegati',
        ),
    )
    // Divider
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    // Section + Thumbnail
    .addSectionComponents(thumbnailSection)
    // Divider
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    // MediaGallery
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('### \ud83c\udf7e\ufe0f MediaGallery'),
    )
    .addMediaGalleryComponents(gallery)
    // Divider
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Large),
    )
    // Interactive: Select Menu
    .addActionRowComponents(selectRow)
    // Interactive: Button
    .addActionRowComponents(buttonRow)
    // Divider
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    // File
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('### \ud83d\udcc1 File'),
    )
    .addFileComponents(
      new FileBuilder()
        .setURL(`attachment://${FILE_NAME}`),
    )
    // Footer
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          '> Questo messaggio e\' stato costruito interamente con **Components V2** ' +
          'usando `discord.js` v14. Ogni elemento e\' un componente layout.',
        ),
    );
}
