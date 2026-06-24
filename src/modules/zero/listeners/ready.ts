import { Events, type Client } from 'discord.js';
import type { EventDefinition } from '../../../contracts/module.contract.ts';
import { LitLogger } from '../../../kernel/logger.ts';

async function execute(client: Client): Promise<void> {
  LitLogger.info('Zero', `Biscotto is online as ${client.user?.tag}`);
}

export const readyEvent: EventDefinition = {
  event: Events.ClientReady,
  once: true,
  execute,
};
