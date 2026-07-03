import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { CommandDefinition } from '../contracts/module.contract.js';
import { LitLogger } from './logger.js';
import { config } from './config.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

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

    const route = isGuildDeploy
      ? Routes.applicationGuildCommands(config.clientId, config.guildId!)
      : Routes.applicationCommands(config.clientId);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.rest.put(route, { body });
        const registered = Array.isArray(result) ? result.length : 0;
        LitLogger.info('Registrar', `Successfully registered ${registered} command(s) to ${target}`);
        return;
      } catch (error) {
        const isLast = attempt === MAX_RETRIES;
        if (isLast) {
          LitLogger.error('Registrar', `Failed to deploy commands after ${MAX_RETRIES} attempts: ${error}`);
          LitLogger.warn('Registrar', 'Bot will continue — commands may not be available until deployment succeeds');
          return;
        }
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        LitLogger.warn('Registrar', `Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}
