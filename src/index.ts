import { resolve } from 'node:path';
import { Events } from 'discord.js';
import { createClient, config, LitLogger, ModuleLoader, CommandRegistrar, CommandDispatcher, StorageManager } from './kernel/index.ts';
import { loadFromDisk } from './kernel/dynamic-loader.ts';
import { modules as builtinModules } from './modules/index.ts';

// Global storage instance accessible from any module
export let storage: StorageManager;

async function bootstrap(): Promise<void> {
  LitLogger.banner();
  LitLogger.info('Bootstrap', 'Initializing Biscotto...');

  const client = createClient();
  const loader = new ModuleLoader(client);
  const registrar = new CommandRegistrar();
  const dispatcher = new CommandDispatcher(client);

  // Initialize storage
  storage = new StorageManager(config.storage);
  await LitLogger.measure('Storage', 'Initialization', () => storage.init());

  // Load builtin modules (zero)
  await LitLogger.measure('Bootstrap', 'Builtin modules', () => loader.loadAll(builtinModules));

  // Load external modules from .biscotto/modules/
  const modulesDir = resolve(process.cwd(), '.biscotto', 'modules');
  const { modules: externalModules, errors } = await loadFromDisk(modulesDir, builtinModules);

  if (errors.length > 0) {
    LitLogger.warn('Bootstrap', `${errors.length} module(s) failed to load`);
  }

  if (externalModules.length > 0) {
    await LitLogger.measure('Bootstrap', 'External modules', () => loader.loadAll(externalModules));
  }

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
