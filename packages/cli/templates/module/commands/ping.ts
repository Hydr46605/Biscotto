import { defineCommand } from '@biscotto/core';

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Check if the bot is alive',
  dmPermission: true,
  run(ctx) {
    ctx.reply({ content: 'Pong!' });
  },
});
