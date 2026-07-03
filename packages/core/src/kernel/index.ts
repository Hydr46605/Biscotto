export { config } from './config.js';
export { createClient } from './client.js';
export { LitLogger } from './logger.js';
export { ModuleLoader } from './loader.js';
export { CommandRegistrar } from './registrar.js';
export { InteractionRouter } from './router.js';
export { setupHotReload } from './hotreload.js';
export { validateManifest, loadManifest, ManifestError } from './validation.js';

export {
  resolveDependencies,
  checkDependencies,
  checkVersionConstraints,
  buildDependencyGraph,
  checkServiceRequirements,
  DependencyError,
} from './resolver.js';

export { loadFromDisk, discoverModules } from './discovery.js';
export { CooldownManager } from './middleware/cooldown.js';
export { PermissionChecker } from './middleware/permissions.js';
export { MiddlewarePipeline } from './middleware/pipeline.js';
export { ServiceRegistry } from './services.js';
export { ModuleLifecycle, ModuleState } from './lifecycle.js';
export { ModuleData, defineConfig } from './data.js';

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
} from './define.js';

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
  LifecycleHooks,
} from './define.js';

export type { InstalledModule, InstalledFile } from './registry.js';
export type { ResolvedModule } from './resolver.js';
export type { LoadResult, LoadError } from './discovery.js';
export type { StorageProvider, StorageDriver, MysqlConfig } from './storage/types.js';
export type { MiddlewareConfig, MiddlewareResult } from './middleware/pipeline.js';
export type { PermissionString } from './middleware/permissions.js';
export type { ServiceInfo } from './services.js';
export type { ModuleContext } from './lifecycle.js';
export type { ConfigSchema, ConfigField, ModuleConfig as ModuleConfigType } from './data.js';
