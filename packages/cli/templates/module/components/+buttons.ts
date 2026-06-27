import { defineButton } from '@biscotto/core';

export const buttonComponents = [
  defineButton({
    customId: 'example-button',
    async execute(ctx) {
      await ctx.reply('Button clicked!', { ephemeral: true });
    },
  }),
];
