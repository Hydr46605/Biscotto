import { defineCommand } from '@biscotto/core';

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Check if the bot is alive',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});
