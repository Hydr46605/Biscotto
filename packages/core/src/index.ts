import { resolve } from 'node:path';
import { Events } from 'discord.js';
import { createClient, config, LitLogger, ModuleLoader, CommandRegistrar, InteractionRouter } from './kernel/index.ts';
import { loadFromDisk } from './kernel/discovery.ts';
import { modules as builtinModules } from './modules/index.ts';

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
export { ServiceRegistry } from './kernel/services.ts';
export type { ServiceInfo } from './kernel/services.ts';
export { ModuleLifecycle, ModuleState } from './kernel/lifecycle.ts';
export type { ModuleContext } from './kernel/lifecycle.ts';
export { ModuleData, defineConfig } from './kernel/module-config.ts';
export type { ConfigSchema, ConfigField } from './kernel/module-config.ts';
export type { StorageProvider, StorageDriver } from './kernel/storage/types.ts';

async function bootstrap(): Promise<void> {
  LitLogger.banner();
  LitLogger.info('Bootstrap', 'Initializing Biscotto...');

  const root = process.cwd();
  const loader = new ModuleLoader();
  const registrar = new CommandRegistrar();

  // Initialize MySQL if configured
  if (config.mysql) {
    await LitLogger.measure('Storage', 'MySQL pool', () => loader.initMysql(config.mysql!));
  }

  // Load all modules (collects commands, events, intents without client)
  await LitLogger.measure('Bootstrap', 'Builtin modules', () => loader.loadAll(builtinModules, undefined, root));

  const modulesDir = resolve(root, '.biscotto', 'modules');
  const { modules: externalModules, errors } = await loadFromDisk(modulesDir, builtinModules);

  if (errors.length > 0) {
    LitLogger.warn('Bootstrap', `${errors.length} module(s) failed to load`);
  }

  if (externalModules.length > 0) {
    await LitLogger.measure('Bootstrap', 'External modules', () => loader.loadAll(externalModules, undefined, root));
  }

  // Setup per-module data and storage
  const allModules = [...builtinModules, ...externalModules];
  for (const mod of allModules) {
    await loader.setupModuleData(mod);
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

  // Log services
  const services = loader.getServices().list();
  if (services.length > 0) {
    LitLogger.info('Bootstrap', `Services: ${services.map((s) => `${s.name} (by ${s.provider})`).join(', ')}`);
  }

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
