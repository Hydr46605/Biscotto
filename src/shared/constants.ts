export const EMOJI = {
  SUCCESS: '\u2705',
  ERROR: '\u274c',
  WARNING: '\u26a0\ufe0f',
  INFO: '\u2139\ufe0f',
  ROCKET: '\ud83d\ude80',
  SPARKLES: '\u2728',
} as const;

export const LIMITS = {
  MAX_COMPONENTS: 40,
  MAX_TEXT_LENGTH: 4000,
  MAX_SELECT_OPTIONS: 25,
  MAX_EMBED_DESCRIPTION: 4096,
} as const;
