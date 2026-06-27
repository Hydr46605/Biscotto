import { defineEvent } from '@biscotto/core';

export const onReady = defineEvent({
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user?.tag}`);
  },
});
