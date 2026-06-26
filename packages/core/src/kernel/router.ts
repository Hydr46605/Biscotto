import { Events, type Client, type Interaction } from 'discord.js';
import type {
  CommandDefinition,
  ButtonDefinition,
  SelectMenuDefinition,
  ModalDefinition,
  AutocompleteDefinition,
  UserContextMenuDefinition,
  MessageContextMenuDefinition,
} from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

export class InteractionRouter {
  private commands = new Map<string, CommandDefinition>();
  private buttons = new Map<string, ButtonDefinition>();
  private selectMenus = new Map<string, SelectMenuDefinition>();
  private modals = new Map<string, ModalDefinition>();
  private autocompletes = new Map<string, AutocompleteDefinition>();
  private userContextMenus = new Map<string, UserContextMenuDefinition>();
  private messageContextMenus = new Map<string, MessageContextMenuDefinition>();

  constructor(private readonly client: Client) {}

  register(interactions: {
    commands?: CommandDefinition[];
    buttons?: ButtonDefinition[];
    selectMenus?: SelectMenuDefinition[];
    modals?: ModalDefinition[];
    autocompletes?: AutocompleteDefinition[];
    userContextMenus?: UserContextMenuDefinition[];
    messageContextMenus?: MessageContextMenuDefinition[];
  }): void {
    for (const cmd of interactions.commands ?? []) {
      this.commands.set(cmd.data.name, cmd);
    }
    for (const btn of interactions.buttons ?? []) {
      this.buttons.set(btn.customId, btn);
    }
    for (const menu of interactions.selectMenus ?? []) {
      this.selectMenus.set(menu.customId, menu);
    }
    for (const modal of interactions.modals ?? []) {
      this.modals.set(modal.customId, modal);
    }
    for (const ac of interactions.autocompletes ?? []) {
      this.autocompletes.set(ac.name, ac);
    }
    for (const ucm of interactions.userContextMenus ?? []) {
      this.userContextMenus.set(ucm.name, ucm);
    }
    for (const mcm of interactions.messageContextMenus ?? []) {
      this.messageContextMenus.set(mcm.name, mcm);
    }

    const total =
      this.commands.size +
      this.buttons.size +
      this.selectMenus.size +
      this.modals.size +
      this.autocompletes.size +
      this.userContextMenus.size +
      this.messageContextMenus.size;

    LitLogger.info('Router', `Registered ${total} interaction(s) for dispatch`);
    if (this.commands.size > 0) LitLogger.tree('Router', '|-', `Commands: ${this.commands.size}`, 'debug');
    if (this.buttons.size > 0) LitLogger.tree('Router', '|-', `Buttons: ${this.buttons.size}`, 'debug');
    if (this.selectMenus.size > 0) LitLogger.tree('Router', '|-', `SelectMenus: ${this.selectMenus.size}`, 'debug');
    if (this.modals.size > 0) LitLogger.tree('Router', '|-', `Modals: ${this.modals.size}`, 'debug');
    if (this.autocompletes.size > 0) LitLogger.tree('Router', '|-', `Autocompletes: ${this.autocompletes.size}`, 'debug');
    if (this.userContextMenus.size > 0) LitLogger.tree('Router', '|-', `UserMenus: ${this.userContextMenus.size}`, 'debug');
    if (this.messageContextMenus.size > 0) LitLogger.tree('Router', '|-', `MessageMenus: ${this.messageContextMenus.size}`, 'debug');
  }

  listen(): void {
    this.client.on(Events.InteractionCreate, (interaction) => {
      this.route(interaction);
    });
    LitLogger.info('Router', 'Listening for interactions...');
  }

  private async route(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isAnySelectMenu()) {
        await this.handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
      } else if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      } else if (interaction.isUserContextMenuCommand()) {
        await this.handleUserContextMenu(interaction);
      } else if (interaction.isMessageContextMenuCommand()) {
        await this.handleMessageContextMenu(interaction);
      }
    } catch (error) {
      LitLogger.error('Router', `Unhandled interaction error: ${error}`);
    }
  }

  private async handleCommand(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    const command = this.commands.get(interaction.commandName);
    if (!command) {
      LitLogger.warn('Router', `Unknown command: /${interaction.commandName}`);
      return;
    }

    const user = interaction.user.tag;
    const guild = interaction.guild?.name ?? 'DM';
    LitLogger.info('Router', `Executing /${interaction.commandName} \u2014 ${user} in ${guild}`);

    try {
      await command.execute(interaction, this.client);
      LitLogger.debug('Router', `/${interaction.commandName} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing /${interaction.commandName}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async handleButton(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    const handler = this.buttons.get(interaction.customId);
    if (!handler) {
      LitLogger.warn('Router', `Unknown button: ${interaction.customId}`);
      return;
    }

    LitLogger.info('Router', `Executing button:${interaction.customId} \u2014 ${interaction.user.tag}`);

    try {
      await handler.execute(interaction, this.client);
      LitLogger.debug('Router', `Button ${interaction.customId} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing button ${interaction.customId}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async handleSelectMenu(interaction: Interaction): Promise<void> {
    if (!interaction.isAnySelectMenu()) return;
    const handler = this.selectMenus.get(interaction.customId);
    if (!handler) {
      LitLogger.warn('Router', `Unknown select menu: ${interaction.customId}`);
      return;
    }

    LitLogger.info('Router', `Executing select:${interaction.customId} \u2014 ${interaction.user.tag}`);

    try {
      await handler.execute(interaction, this.client);
      LitLogger.debug('Router', `Select menu ${interaction.customId} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing select menu ${interaction.customId}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async handleModal(interaction: Interaction): Promise<void> {
    if (!interaction.isModalSubmit()) return;
    const handler = this.modals.get(interaction.customId);
    if (!handler) {
      LitLogger.warn('Router', `Unknown modal: ${interaction.customId}`);
      return;
    }

    LitLogger.info('Router', `Executing modal:${interaction.customId} \u2014 ${interaction.user.tag}`);

    try {
      await handler.execute(interaction, this.client);
      LitLogger.debug('Router', `Modal ${interaction.customId} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing modal ${interaction.customId}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async handleAutocomplete(interaction: Interaction): Promise<void> {
    if (!interaction.isAutocomplete()) return;
    const handler = this.autocompletes.get(interaction.commandName);
    if (!handler) return;

    try {
      await handler.execute(interaction, this.client);
    } catch (error) {
      LitLogger.error('Router', `Error executing autocomplete ${interaction.commandName}: ${error}`);
    }
  }

  private async handleUserContextMenu(interaction: Interaction): Promise<void> {
    if (!interaction.isUserContextMenuCommand()) return;
    const handler = this.userContextMenus.get(interaction.commandName);
    if (!handler) {
      LitLogger.warn('Router', `Unknown user context menu: ${interaction.commandName}`);
      return;
    }

    LitLogger.info('Router', `Executing userMenu:${interaction.commandName} \u2014 ${interaction.user.tag}`);

    try {
      await handler.execute(interaction, this.client);
      LitLogger.debug('Router', `User context menu ${interaction.commandName} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing user context menu ${interaction.commandName}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async handleMessageContextMenu(interaction: Interaction): Promise<void> {
    if (!interaction.isMessageContextMenuCommand()) return;
    const handler = this.messageContextMenus.get(interaction.commandName);
    if (!handler) {
      LitLogger.warn('Router', `Unknown message context menu: ${interaction.commandName}`);
      return;
    }

    LitLogger.info('Router', `Executing messageMenu:${interaction.commandName} \u2014 ${interaction.user.tag}`);

    try {
      await handler.execute(interaction, this.client);
      LitLogger.debug('Router', `Message context menu ${interaction.commandName} completed`);
    } catch (error) {
      LitLogger.error('Router', `Error executing message context menu ${interaction.commandName}: ${error}`);
      await this.replyError(interaction);
    }
  }

  private async replyError(interaction: Interaction): Promise<void> {
    if (!('reply' in interaction)) return;
    const i = interaction as { reply: Function; replied: boolean; deferred: boolean; followUp: Function };
    const reply = {
      content: '\u274c An error occurred while executing this interaction.',
      ephemeral: true,
    };

    if (i.replied || i.deferred) {
      await i.followUp(reply).catch(() => {});
    } else {
      await i.reply(reply).catch(() => {});
    }
  }
}
