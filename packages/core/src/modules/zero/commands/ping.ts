import { defineCommand } from '../../../kernel/define.ts';

export default defineCommand({
  name: 'ping',
  description: 'Check bot responsiveness',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});
