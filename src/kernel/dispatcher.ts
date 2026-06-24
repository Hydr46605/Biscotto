import { Events, type Client, type Interaction } from 'discord.js';
import type { CommandDefinition } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

export class CommandDispatcher {
  private commands = new Map<string, CommandDefinition>();

  constructor(private readonly client: Client) {}

  register(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.commands.set(cmd.data.name, cmd);
    }
    LitLogger.info('Dispatcher', `Registered ${commands.length} command(s) for dispatch`);
    for (const cmd of commands) {
      LitLogger.tree('Dispatcher', `\u251c\u2500`, `/${cmd.data.name}`, 'debug');
    }
  }

  listen(): void {
    this.client.on(Events.InteractionCreate, (interaction) => {
      this.handle(interaction);
    });
    LitLogger.info('Dispatcher', 'Listening for interactions...');
  }

  private async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      LitLogger.warn('Dispatcher', `Unknown command: /${interaction.commandName}`);
      return;
    }

    const user = interaction.user.tag;
    const guild = interaction.guild?.name ?? 'DM';
    LitLogger.info('Dispatcher', `Executing /${interaction.commandName} \u2014 ${user} in ${guild}`);

    try {
      await command.execute(interaction, this.client);
      LitLogger.debug('Dispatcher', `/${interaction.commandName} completed`);
    } catch (error) {
      LitLogger.error('Dispatcher', `Error executing /${interaction.commandName}: ${error}`);

      const reply = {
        content: '\u274c An error occurred while executing this command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
