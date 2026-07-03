import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createClient,
  config,
  LitLogger,
  ModuleLoader,
  CommandRegistrar,
  InteractionRouter,
} from './kernel/index.js';
import { loadFromDisk } from './kernel/discovery.js';
import { modules as builtinModules } from './modules/index.js';
import { setupHotReload } from './kernel/hotreload.js';

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
} from './kernel/define.js';

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
} from './kernel/define.js';

export type { ModuleManifest, BiscottoModule } from './contracts/module.contract.js';
export type { LifecycleHooks } from './kernel/define.js';
export { ServiceRegistry } from './kernel/services.js';
export type { ServiceInfo } from './kernel/services.js';
export { ModuleLifecycle, ModuleState } from './kernel/lifecycle.js';
export type { ModuleContext } from './kernel/lifecycle.js';
export { ModuleData, defineConfig } from './kernel/data.js';
export type { ConfigSchema, ConfigField } from './kernel/data.js';
export type { StorageProvider, StorageDriver } from './kernel/storage/types.js';
export type { MysqlConfig } from './kernel/storage/types.js';

/**
 * Bootstraps a Biscotto bot: reads env, loads modules (builtin + installed),
 * creates the Discord client, registers commands, mounts the interaction
 * router, wires the hot-reload poller, and logs in.
 *
 * Intended to be called by the user from `src/index.ts`:
 *
 *   import 'dotenv/config';
 *   import { run } from '@biscotto/core';
 *   run();
 *
 * `run()` is invoked automatically only when this file is the program
 * entry point (matched via `import.meta.url === pathToFileURL(process.argv[1]).href`,
 * the ESM-native equivalent of the CJS `require.main === module` idiom).
 * Importing `@biscotto/core` for type-only or programmatic reasons will
 * NOT trigger a bot launch.
 */
export async function run(): Promise<void> {
  LitLogger.banner();
  LitLogger.info('Bootstrap', 'Initializing Biscotto...');

  const root = process.cwd();
  const loader = new ModuleLoader();
  const registrar = new CommandRegistrar();

  // Initialize MySQL if configured
  if (config.mysql) {
    await LitLogger.measure('Storage', 'MySQL pool', () => loader.initMysql(config.mysql!));
  }

  // Discover external modules from disk
  const modulesDir = resolve(root, '.biscotto', 'modules');
  const { modules: externalModules, errors } = await loadFromDisk(modulesDir, builtinModules, root);

  if (errors.length > 0) {
    LitLogger.warn('Bootstrap', `${errors.length} module(s) failed to load`);
  }

  // Collect all modules and setup data/storage BEFORE loading
  // (lifecycle hooks need data + storage to be available)
  const allModules = [...builtinModules, ...externalModules];
  loader.setRoot(root);
  for (const mod of allModules) {
    await loader.setupModuleData(mod);
  }

  // Extract intents from modules and create the Discord client
  const extraIntents = loader.getIntentsFromModules(allModules);
  const client = createClient(extraIntents);

  // Initialize lifecycle with client so hooks can access it
  loader.initLifecycle(client);

  // Load all modules — lifecycle transitions now have data, storage, and client
  await LitLogger.measure('Bootstrap', 'Builtin modules', () => loader.loadAll(builtinModules, root));
  if (externalModules.length > 0) {
    await LitLogger.measure('Bootstrap', 'External modules', () => loader.loadAll(externalModules, root));
  }

  // Initialize all modules with the real client (runs onInit hooks)
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

  // Ready logging is owned by the `zero` module's
  // `defineEvent({ event: 'ready' })` listener. No additional handler here:
  // keeping a single owner avoids double-firing.

  // Wire the hot-reload poller so `biscotto reload <module>` actually
  // reloads the named in-process module without restarting the bot.
  setupHotReload(loader, root);

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

/**
 * Auto-launch guard. Wrapped so importing the package for type-only or
 * programmatic reasons (e.g. Vitest, programmatic embedders) does NOT
 * immediately start the Discord client.
 *
 * ESM doesn't expose `require.main` / `module` the way CJS does. The
 * canonical replacement is to compare `import.meta.url` (the URL of this
 * file when imported) against `pathToFileURL(process.argv[1])` (the URL
 * of whatever script the user invoked). A match means this file IS the
 * program entry point, so the auto-launch should fire.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    LitLogger.error('Fatal', `Failed to start: ${error}`);
    process.exit(1);
  });
}
