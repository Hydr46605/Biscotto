// Example button handler — emitted when the stack includes buttons.
// Replace `customId` and the reply body with your own logic.
import { defineButton } from '@biscotto/core';

export const confirmYesButton = defineButton({
  customId: 'confirm-yes',
  async execute(ctx) {
    await ctx.reply('Confirmed!');
  },
});
