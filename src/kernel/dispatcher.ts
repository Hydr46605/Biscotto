import { Events, type Client, type Interaction } from 'discord.js';
import type { CommandDefinition } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';

const log = LitLogger.child('Dispatcher');

export class CommandDispatcher {
  private commands = new Map<string, CommandDefinition>();

  constructor(private readonly client: Client) {}

  register(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.commands.set(cmd.data.name, cmd);
    }
    log.info(`Registered ${commands.length} command(s) for dispatch`);
    for (const cmd of commands) {
      log.debug(`  \u251c\u2500 /${cmd.data.name}`);
    }
  }

  listen(): void {
    this.client.on(Events.InteractionCreate, (interaction) => {
      this.handle(interaction);
    });
    log.info('Listening for interactions...');
  }

  private async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      log.warn(`Unknown command: /${interaction.commandName}`);
      return;
    }

    const user = interaction.user.tag;
    const guild = interaction.guild?.name ?? 'DM';
    log.info(`Executing /${interaction.commandName} \u2014 ${user} in ${guild}`);

    try {
      await command.execute(interaction, this.client);
      log.debug(`  /${interaction.commandName} completed`);
    } catch (error) {
      log.error(`Error executing /${interaction.commandName}: ${error}`);

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
