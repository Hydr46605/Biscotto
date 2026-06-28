import { defineModule, defineCommand } from '@biscotto/core';

const ping = defineCommand({
  name: 'ping',
  description: 'Check if the bot is alive',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});

export default defineModule({
  manifest: {
    name: '{{MODULE_NAME}}',
    version: '0.1.0',
    description: '{{DESCRIPTION}}',
  },
  commands: [ping],
  onLoad(ctx) {
    ctx.logger.info('{{MODULE_NAME}} loaded');
  },
});
