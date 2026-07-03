import { Events } from 'discord.js';
import { defineEvent } from '../../../kernel/define.js';
import { LitLogger } from '../../../kernel/logger.js';

export default defineEvent({
  event: Events.ClientReady,
  once: true,
  async execute(client) {
    LitLogger.info('Zero', `Biscotto is online as ${(client as any).user?.tag}`);
  },
});
