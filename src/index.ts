import { Events } from 'discord.js';
import { createClient, config, LitLogger, ModuleLoader, CommandRegistrar, CommandDispatcher, StorageManager } from './kernel/index.ts';
import { modules } from './modules/index.ts';

// Global storage instance accessible from any module
export let storage: StorageManager;

async function bootstrap(): Promise<void> {
  LitLogger.banner();
  LitLogger.info('Bootstrap', 'Initializing Hydrotto...');

  const client = createClient();
  const loader = new ModuleLoader(client);
  const registrar = new CommandRegistrar();
  const dispatcher = new CommandDispatcher(client);

  // Initialize storage
  storage = new StorageManager(config.storage);
  await LitLogger.measure('Storage', 'Initialization', () => storage.init());

  // Load all modules
  await LitLogger.measure('Bootstrap', 'Module loading', () => loader.loadAll(modules));

  // Register commands with Discord API
  const commands = loader.getCommands();
  if (commands.length > 0) {
    await LitLogger.measure('Registrar', 'Command deployment', () => registrar.deploy(commands));
  }

  // Setup interaction dispatcher
  dispatcher.register(commands);
  dispatcher.listen();

  // Register events from modules
  const events = loader.getEvents();
  for (const eventDef of events) {
    const handler = (...args: unknown[]) => eventDef.execute(...args);
    if (eventDef.once) {
      client.once(eventDef.event as never, handler as never);
    } else {
      client.on(eventDef.event as never, handler as never);
    }
  }
  LitLogger.info('Dispatcher', `Registered ${events.length} event listener(s)`);

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    LitLogger.ready(
      readyClient.user.tag,
      readyClient.guilds.cache.size,
      (readyClient as any).uptime ?? 0,
    );
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    LitLogger.line();
    LitLogger.warn('Shutdown', 'Received SIGINT, shutting down gracefully...');
    await storage.close();
    await loader.destroyAll();
    client.destroy();
    LitLogger.info('Shutdown', 'Goodbye!');
    process.exit(0);
  });

  // Login
  await LitLogger.measure('Bootstrap', 'Discord login', () => client.login(config.token));
}

bootstrap().catch((error) => {
  LitLogger.error('Fatal', `Failed to start: ${error}`);
  process.exit(1);
});
