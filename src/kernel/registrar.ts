import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { CommandDefinition } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';
import { config } from './config.ts';

const log = LitLogger.child('Registrar');

export class CommandRegistrar {
  private readonly rest: REST;

  constructor() {
    this.rest = new REST({ version: '10' }).setToken(config.token);
  }

  async deploy(commands: CommandDefinition[]): Promise<void> {
    const body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(
      (cmd) => cmd.data.toJSON(),
    );

    log.info(`Deploying ${body.length} command(s) to Discord API...`);
    log.debug(`Commands: ${body.map((c) => `/${c.name}`).join(', ')}`);

    try {
      const result = await this.rest.put(
        Routes.applicationCommands(config.clientId),
        { body },
      );

      const registered = Array.isArray(result) ? result.length : 0;
      log.info(`Successfully registered ${registered} command(s) globally`);
    } catch (error) {
      log.error(`Failed to deploy commands: ${error}`);
      log.warn('Bot will continue — commands may not be available until deployment succeeds');
    }
  }
}
