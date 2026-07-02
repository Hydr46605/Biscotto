// Example modal handler — emitted when the stack includes modals.
// Pair with a ModalBuilder in a command to push this modal to users.
import { defineModal } from '@biscotto/core';

export const feedbackModal = defineModal({
  customId: 'feedback-form',
  fields: [
    { type: 'paragraph', label: 'Feedback', required: true },
  ],
  async execute(ctx) {
    const feedback = ctx.fields.get('Feedback');
    await ctx.reply(`Feedback received: ${feedback}`);
  },
});
