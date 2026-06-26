import { Events } from 'discord.js';
import { defineEvent } from '@biscotto/core';

export default defineEvent({
  event: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[{{MODULE_NAME}}] Biscotto is online as ${(client as any).user?.tag}`);
  },
});
