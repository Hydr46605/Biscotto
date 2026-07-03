# Module Configuration

Each module can define a typed config schema. Biscotto handles creating, merging, and validating configs automatically.

## Defining Config

Use `defineConfig` to create a typed schema:

```ts
import { defineConfig } from '@biscotto/core';

const config = defineConfig({
  schema: {
    prefix: { type: 'string', description: 'Command prefix', default: '!' },
    maxWarnings: { type: 'number', description: 'Max warnings before mute', default: 3 },
    logActions: { type: 'boolean', description: 'Log moderation actions', default: true },
    ignoredChannels: { type: 'json', description: 'Channels to ignore', default: [] },
  },
  defaults: {
    prefix: '!',
    maxWarnings: 3,
    logActions: true,
    ignoredChannels: [],
  },
});
```

## Schema Fields

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'string' \| 'number' \| 'boolean' \| 'json'` | Field type |
| `description` | `string` | Human-readable description |
| `default` | `unknown` | Default value |
| `required` | `boolean` | Whether the field is required |

## Using Config in Modules

Load your config inside `onLoad` via `ctx.data.loadConfig()`:

```ts
import { defineModule, defineConfig } from '@biscotto/core';

const config = defineConfig({
  schema: {
    greeting: { type: 'string', default: 'Hello!' },
  },
  defaults: { greeting: 'Hello!' },
});

export default defineModule({
  manifest,
  onLoad(ctx) {
    const cfg = ctx.data.loadConfig(config.schema, config.defaults);
    ctx.logger.info(`Greeting: ${cfg.greeting}`);
  },
});
```

## Accessing Config

The `ModuleContext` provides these config methods via `ctx.data`:

```ts
onLoad(ctx) {
  // Load full config with schema validation and defaults
  const cfg = ctx.data.loadConfig(config.schema, config.defaults);

  // Get a single config value
  const rate = ctx.data.getConfig<number>('taxRate');

  // Set a single config value (saves to disk immediately)
  ctx.data.setConfig('taxRate', 0.15);

  // Get all config keys
  const keys = ctx.data.configKeys();

  // Check if config file exists
  const exists = ctx.data.hasConfig();
}
```

## How Config Merging Works

When a module loads, Biscotto automatically:

1. Creates default config if none exists
2. Adds missing keys from schema defaults
3. Validates existing values against schema types
4. Replaces invalid values with defaults

This means you can safely add new config fields to future versions — existing configs will be updated automatically.

## Storage Location

Configs are stored as JSON in `.biscotto/configs/<module>/config.json`:

```
.biscotto/
├── configs/
│   ├── zero/
│   │   └── config.json
│   ├── moderation/
│   │   └── config.json
│   └── welcome/
│       └── config.json
├── modules/
│   ├── zero/
│   └── moderation/
└── installed.json
```

## CLI Commands

```bash
biscotto config <module>              # show all config values
biscotto config <module> <key>        # show a specific value
biscotto config <module> <key> <val>  # set a value
```

Values are parsed as:
- `true` / `false` → boolean
- `null` → null
- Numbers → number
- JSON strings → parsed JSON
- Everything else → string

```bash
$ biscotto config zero prefix
  zero.prefix: !

$ biscotto config zero prefix ?
  zero.prefix: ! → ?
```
