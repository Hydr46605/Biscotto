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

    const isGuildDeploy = config.guildId !== null;
    const target = isGuildDeploy ? `guild ${config.guildId}` : 'global';

    log.info(`Deploying ${body.length} command(s) to ${target}...`);
    log.debug(`Commands: ${body.map((c) => `/${c.name}`).join(', ')}`);

    try {
      const route = isGuildDeploy
        ? Routes.applicationGuildCommands(config.clientId, config.guildId!)
        : Routes.applicationCommands(config.clientId);

      const result = await this.rest.put(route, { body });

      const registered = Array.isArray(result) ? result.length : 0;
      log.info(`Successfully registered ${registered} command(s) to ${target}`);
    } catch (error) {
      log.error(`Failed to deploy commands: ${error}`);
      log.warn('Bot will continue — commands may not be available until deployment succeeds');
    }
  }
}
