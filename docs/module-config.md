# Module Configuration

Biscotto provides a built-in configuration system for modules. Each module can define a config schema with typed fields, and configs are automatically created, merged, and validated.

## Defining Config

Use `defineConfig` to create a typed configuration schema:

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

## Config Fields

Each field in the schema defines:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'string' \| 'number' \| 'boolean' \| 'json'` | Field type |
| `description` | `string` | Human-readable description |
| `default` | `unknown` | Default value |
| `required` | `boolean` | Whether the field is required |

## Using Config in Modules

Pass the config to `defineModule` and access it via `ctx.config` in lifecycle hooks:

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
  config,
  onLoad(ctx) {
    const greeting = ctx.config.get<string>(manifest.name, 'greeting');
    ctx.logger.info(`Greeting: ${greeting}`);
  },
});
```

## Accessing Config

The `ModuleContext` provides these config methods:

```ts
// Get a config value (returns T or undefined)
const prefix = ctx.config.get<string>('mymod', 'prefix');

// Set a config value (saves to disk immediately)
ctx.config.set('mymod('mymod', 'prefix', '?');

// Check if config exists
const hasConfig = ctx.config.has('mymod');

// Get all config keys
const keys = ctx.config.keys('mymod');
```

## Config Storage

Configs are stored as JSON files in `.biscotto/configs/<module>.json`:

```
.biscotto/
├── configs/
│   ├── zero.json
│   ├── moderation.json
│   └── welcome.json
├── modules/
│   ├── zero/
│   └── moderation/
└── installed.json
```

## Config Merging

When a module loads, Biscotto automatically:

1. Creates default config if none exists
2. Adds missing keys from schema defaults
3. Validates existing values against schema types
4. Replaces invalid values with defaults

This means you can safely add new config fields to future versions — existing configs will be updated automatically.

## CLI Commands

### View Config

```bash
biscotto config <module>
```

Shows all config values for a module.

### Get Specific Value

```bash
biscotto config <module> <key>
```

Shows a single config value.

### Set Value

```bash
biscotto config <module> <key> <value>
```

Sets a config value. The value is parsed as:
- `true` / `false` → boolean
- `null` → null
- Numbers → number
- JSON strings → parsed JSON
- Everything else → string

## Example

```bash
# View zero module config
$ biscotto config zero

# Get a specific value
$ biscotto config zero prefix

# Set a value
$ biscotto config zero prefix ?

# Output:
#   zero.prefix: ! → ?
```
