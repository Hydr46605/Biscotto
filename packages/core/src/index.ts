import { resolve } from 'node:path';
import { Events } from 'discord.js';
import { createClient, config, LitLogger, ModuleLoader, CommandRegistrar, InteractionRouter, StorageManager } from './kernel/index.ts';
import { loadFromDisk } from './kernel/discovery.ts';
import { modules as builtinModules } from './modules/index.ts';

// Global storage instance accessible from any module
export let storage: StorageManager;

// Re-export API helpers for module authors
export {
  defineCommand,
  defineButton,
  defineSelectMenu,
  defineModal,
  defineAutocomplete,
  defineUserContextMenu,
  defineMessageContextMenu,
  defineEvent,
  defineModule,
} from './kernel/define.ts';
export type {
  CommandContext,
  CommandConfig,
  ButtonContext,
  ButtonConfig,
  SelectMenuContext,
  SelectMenuConfig,
  ModalContext,
  ModalConfig,
  AutocompleteContext,
  AutocompleteConfig,
  UserContextMenuContext,
  UserContextMenuConfig,
  MessageContextMenuContext,
  MessageContextMenuConfig,
  EventConfig,
  ModuleConfig,
} from './kernel/define.ts';
export type { ModuleManifest, BiscottoModule } from './contracts/module.contract.ts';

async function bootstrap(): Promise<void> {
  LitLogger.banner();
  LitLogger.info('Bootstrap', 'Initializing Biscotto...');

  const loader = new ModuleLoader();
  const registrar = new CommandRegistrar();

  // Initialize storage
  storage = new StorageManager(config.storage);
  await LitLogger.measure('Storage', 'Initialization', () => storage.init());

  // Load all modules (collects commands, events, intents without client)
  await LitLogger.measure('Bootstrap', 'Builtin modules', () => loader.loadAll(builtinModules));

  const modulesDir = resolve(process.cwd(), '.biscotto', 'modules');
  const { modules: externalModules, errors } = await loadFromDisk(modulesDir, builtinModules);

  if (errors.length > 0) {
    LitLogger.warn('Bootstrap', `${errors.length} module(s) failed to load`);
  }

  if (externalModules.length > 0) {
    await LitLogger.measure('Bootstrap', 'External modules', () => loader.loadAll(externalModules));
  }

  // Merge intents from all modules and create the real client
  const extraIntents = loader.getIntents();
  const client = createClient(extraIntents);

  // Initialize all modules with the real client
  await LitLogger.measure('Bootstrap', 'Module init', () => loader.initAll(client));

  // Register commands with Discord API
  const commands = loader.getCommands();
  if (commands.length > 0) {
    await LitLogger.measure('Registrar', 'Command deployment', () => registrar.deploy(commands));
  }

  // Setup interaction router
  const router = new InteractionRouter(client);
  router.register({
    commands: loader.getCommands(),
    buttons: loader.getButtons(),
    selectMenus: loader.getSelectMenus(),
    modals: loader.getModals(),
    autocompletes: loader.getAutocompletes(),
    userContextMenus: loader.getUserContextMenus(),
    messageContextMenus: loader.getMessageContextMenus(),
  });
  router.listen();

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
  LitLogger.info('Bootstrap', `Registered ${events.length} event listener(s)`);

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
