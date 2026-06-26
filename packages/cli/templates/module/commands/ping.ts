import { defineCommand } from '@biscotto/core';

export default defineCommand({
  name: 'ping',
  description: 'Check bot responsiveness',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});
