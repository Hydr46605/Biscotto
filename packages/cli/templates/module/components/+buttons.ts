import { defineButton } from '@biscotto/core';

export const buttonComponents = [
  defineButton({
    customId: 'example-button',
    run(ctx) {
      ctx.reply({ content: 'Button clicked!', ephemeral: true });
    },
  }),
];
