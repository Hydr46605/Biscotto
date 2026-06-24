import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { CommandDefinition } from '../contracts/module.contract.ts';
import { LitLogger } from './logger.ts';
import { config } from './config.ts';

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

    LitLogger.info('Registrar', `Deploying ${body.length} command(s) to ${target}...`);
    LitLogger.debug('Registrar', `Commands: ${body.map((c) => `/${c.name}`).join(', ')}`);

    try {
      const route = isGuildDeploy
        ? Routes.applicationGuildCommands(config.clientId, config.guildId!)
        : Routes.applicationCommands(config.clientId);

      const result = await this.rest.put(route, { body });

      const registered = Array.isArray(result) ? result.length : 0;
      LitLogger.info('Registrar', `Successfully registered ${registered} command(s) to ${target}`);
    } catch (error) {
      LitLogger.error('Registrar', `Failed to deploy commands: ${error}`);
      LitLogger.warn('Registrar', 'Bot will continue \u2014 commands may not be available until deployment succeeds');
    }
  }
}
