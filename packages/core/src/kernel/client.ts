import { Client, GatewayIntentBits, Partials } from 'discord.js';

const BASE_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.DirectMessages,
];

export function createClient(extraIntents: GatewayIntentBits[] = []): Client {
  const allIntents = [...BASE_INTENTS, ...extraIntents];

  return new Client({
    intents: allIntents,
    partials: [
      Partials.Channel,
      Partials.Message,
    ],
  });
}
