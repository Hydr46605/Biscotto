# Module Ecosystem

Biscotto's module ecosystem allows you to build complex bots from simple, composable modules. Modules can depend on each other, expose APIs, and be enabled/disabled at runtime.

---

## Dependencies

Modules can declare dependencies on other modules. The dependency resolver ensures modules are loaded in the correct order.

### Manifest

```typescript
import type { ModuleManifest } from '@biscotto/core';

export const manifest: ModuleManifest = {
  name: 'shop',
  version: '1.0.0',
  description: 'A shop module',
  dependencies: {
    'ui-builder': '^2.0.0',
    'economy': '^1.0.0',
  },
};
```

### Version Constraints

Biscotto supports semver constraints:

| Constraint | Meaning |
|-----------|---------|
| `^1.0.0` | Compatible with 1.0.0 (>=1.0.0 <2.0.0) |
| `~1.0.0` | Approximately 1.0.0 (>=1.0.0 <1.1.0) |
| `>=1.0.0` | At least 1.0.0 |
| `1.0.0` | Exact version |
| `*` | Any version |

### Dependency Errors

If a dependency is missing or has a version conflict, Biscotto will show an error:

```
✗ Module "shop" requires "ui-builder@^2.0.0" but found "1.5.0"
✗ Dependency cycle detected: economy → storage → logger → economy
✗ Module "mod-tools" not found (required by "admin-panel")
```

### Dependencies vs Requires

| Field | Purpose | Where it goes | When checked |
|-------|---------|---------------|-------------|
| `dependencies` | Module-level deps (version, load order) | `manifest.dependencies` | Boot time |
| `requires` | Service deps (APIs other modules expose) | `manifest.requires` | Runtime (via `ctx.services.require()`) |

Use `dependencies` for modules that must be loaded before yours. Use `requires` for services your module calls at runtime.

---

## Service Registry

Modules can expose APIs (services) that other modules can consume. This enables powerful composition patterns.

### Providing a Service

```typescript
import { defineModule } from '@biscotto/core';

export default defineModule({
  manifest: {
    name: 'ui-builder',
    version: '2.0.0',
    description: 'Helper library for Components V2',
    provides: ['ui-builder'],
  },

  async onLoad(ctx) {
    const ui = {
      createContainer(title) {
        return new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${title}`)
          );
      },
      addField(container, name, value) {
        return container
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${name}**\n${value}`)
          );
      },
    };

    ctx.services.provide('ui-builder', ui);
  },
});
```

### Consuming a Service

```typescript
import { defineModule, defineCommand } from '@biscotto/core';

export default defineModule({
  manifest: {
    name: 'shop',
    version: '1.0.0',
    dependencies: { 'ui-builder': '^2.0.0' },
    requires: ['ui-builder'],
  },

  commands: [
    defineCommand({
      name: 'shop',
      description: 'View the shop',
      async execute(ctx) {
        const ui = ctx.services.require('ui-builder');

        const container = ui.createContainer('Shop');
        ui.addField(container, 'Sword', '100 gold');
        ui.addField(container, 'Shield', '75 gold');

        await ui.replyWithContainer(ctx, container);
      },
    }),
  ],
});
```

### Service API

```typescript
interface ServiceRegistry {
  provide<T>(name: string, service: T): void;
  require<T>(name: string): T;
  has(name: string): boolean;
  list(): ServiceInfo[];
}
```

---

## Module Lifecycle

Modules go through a lifecycle of states:

```
DISCOVERED → LOADED → ENABLED
                  ^        |
                  +--------+ (disable)
                       |
                  DISABLED
                       |
                  UNLOADED
```

### Lifecycle Hooks

```typescript
import { defineModule } from '@biscotto/core';

export default defineModule({
  manifest: { name: 'my-module', version: '1.0.0' },

  // Module loaded — initialize resources
  async onLoad(ctx) {
    ctx.logger.info('Loading module...');
    // Connect to database, load cache, etc.
  },

  // Module enabled — register commands/events
  async onEnable(ctx) {
    ctx.logger.info('Module enabled');
  },

  // Module disabled — cleanup resources
  async onDisable(ctx) {
    ctx.logger.info('Module disabled');
    // Close connections, clear cache, etc.
  },

  // Module unloaded — final cleanup
  async onUnload(ctx) {
    ctx.logger.info('Module unloaded');
  },
});
```

### ModuleContext

Lifecycle hooks receive a `ModuleContext`:

```typescript
interface ModuleContext {
  readonly client: Client;           // Discord.js client
  readonly services: ServiceRegistry; // Service registry
  readonly data: ModuleData;         // Config + free file access
  readonly storage: StorageProvider; // Isolated key-value storage
  readonly logger: ModuleLogger;     // Scoped logger
}
```

---

## CLI Commands

### Enable/Disable Modules

```bash
# Enable a module
biscotto enable shop

# Disable a module
biscotto disable shop

# Reload a module (disable + enable)
biscotto reload shop
```

### Module Status

```bash
# Global status
biscotto status

# Single module status
biscotto status shop
```

Output:
```
  Status:    Running
  PID:       12345
  Modules:   3 installed (2 enabled, 1 disabled)

  Modules:
    [+] zero@1.0.0
    [+] shop@1.2.0
    [-] test@0.1.0
```

### Hot Reload

```bash
# Start with hot reload
biscotto dev
```

The dev command watches the `modules/` directory for changes and automatically restarts the bot when files are modified.

---

## Module States

| State | Description |
|-------|-------------|
| DISCOVERED | Module found on disk |
| LOADED | Module loaded into memory |
| ENABLED | Module is active (commands/events registered) |
| DISABLED | Module is inactive (commands/events unregistered) |
| ERROR | Module encountered an error |
| UNLOADED | Module fully unloaded |

---

## Best Practices

1. **Keep modules focused** — each module should do one thing well
2. **Declare dependencies** — always list what your module needs
3. **Use services** — expose reusable functionality for other modules
4. **Handle lifecycle** — clean up resources in `onDisable`/`onUnload`
5. **Version your modules** — use semver for compatibility

---

*Freshly baked for your server ~ one biscuit at a time.*
