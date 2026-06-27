# Module Storage & Data

Each Biscotto module gets its own isolated data directory where it can store configuration, databases, images, and any other files.

## Directory Structure

```
.biscotto/
  configs/
    Shop/
      config.json         # Structured config (schema + defaults)
      logo.png            # Module files (images, cards, data, etc.)
    Moderation/
      config.json
    Economia/
      config.json
      economy.db          # SQLite database (if storage: sqlite)
  modules/
    shop/
      manifest.ts
      index.ts
```

## Per-Module Data Directory

Every module receives a `ModuleData` instance via `ctx.data` in lifecycle hooks. This provides:

### Structured Config (JSON)

```typescript
import { defineModule, defineConfig } from '@biscotto/core';
import { manifest } from './manifest.js';

const config = defineConfig({
  schema: {
    taxRate: { type: 'number', description: 'Tax rate', default: 0.1 },
    currency: { type: 'string', description: 'Currency symbol', default: '$' },
  },
  defaults: { taxRate: 0.1, currency: '$' },
});

export default defineModule({
  manifest,
  onLoad(ctx) {
    // Load config with schema validation and defaults
    const cfg = ctx.data.loadConfig(config.schema, config.defaults);
    ctx.logger.info(`Tax rate: ${cfg.taxRate}`);

    // Get/set individual values
    const rate = ctx.data.getConfig<number>('taxRate');
    ctx.data.setConfig('taxRate', 0.15);

    // List all config keys
    const keys = ctx.data.configKeys();
  },
});
```

### Free File Access

Store any files — images, cards, data files, databases:

```typescript
export default defineModule({
  manifest,
  onLoad(ctx) {
    // Write files
    ctx.data.writeFile('logo.png', imageBuffer);
    ctx.data.writeFile('data.json', JSON.stringify({ items: [] }));

    // Read files
    const image = ctx.data.readBuffer('logo.png');
    const text = ctx.data.readFile('data.json');

    // Check if file exists
    if (ctx.data.fileExists('logo.png')) {
      // ...
    }

    // List all files
    const files = ctx.data.listFiles();

    // Delete files
    ctx.data.deleteFile('old-file.txt');
  },
});
```

## Per-Module Isolated Storage

Each module can declare its own storage driver in the manifest. Storage is fully isolated — each module gets its own file/database/table.

### Declaring Storage

```typescript
export const manifest: ModuleManifest = {
  name: 'Shop',
  version: '1.0.0',
  storage: { driver: 'sqlite' },  // Each module chooses its own driver
};
```

### Available Drivers

| Driver | Storage Location | Best For |
|--------|-----------------|----------|
| `json` | `.biscotto/data/<Module>/store.json` | Simple key-value, small data |
| `sqlite` | `.biscotto/data/<Module>/store.db` | Structured data, queries |
| `yaml` | `.biscotto/data/<Module>/store.yaml` | Human-readable config |
| `mysql` | Table `<Module>_store` in shared DB | Production, high traffic |

### Using Storage

```typescript
export default defineModule({
  manifest,  // { storage: { driver: 'sqlite' } }
  onLoad(ctx) {
    // ctx.storage is a fully isolated StorageProvider
    await ctx.storage.set('user:123', { name: 'Mario', coins: 100 });
    const user = await ctx.storage.get<{ name: string; coins: number }>('user:123');
    const exists = await ctx.storage.has('user:123');
    await ctx.storage.delete('user:123');

    // Get all entries
    const all = await ctx.storage.all();

    // Clear all data
    await ctx.storage.clear();
  },
});
```

### Exposing Storage to Other Modules

Modules can expose their storage via the service registry:

```typescript
// modules/economia/index.ts
export default defineModule({
  manifest: { name: 'Economia', storage: { driver: 'sqlite' } },
  provides: ['economia-db'],
  onLoad(ctx) {
    // Expose this module's storage to others
    ctx.services.provide('economia-db', ctx.storage, manifest.name);
  },
});

// modules/shop/index.ts
export default defineModule({
  manifest: { name: 'Shop', storage: { driver: 'sqlite' } },
  requires: ['economia-db'],
  onLoad(ctx) {
    const econDB = ctx.services.require<StorageProvider>('economia-db');
    // Use the Economia module's database
    const balance = await econDB.get<number>('user:123:coins');
  },
});
```

## MySQL — Shared Pool

When multiple modules use MySQL, they share a single connection pool (configured via `.env`):

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=biscotto
```

Each module gets its own table: `<ModuleName>_store`. No conflicts, no extra connections.

## CLI Commands

### View Config

```bash
biscotto config Shop              # Show all config values
biscotto config Shop taxRate      # Show specific value
biscotto config Shop taxRate 0.15 # Set a value
biscotto config Shop --files      # List files in module data dir
```

### Module Status

```bash
biscotto status                   # Shows storage driver per module
biscotto status Shop              # Shows storage info for Shop
```

## Migration from Global Storage

The old global `StorageManager` (configured via `STORAGE_DRIVER` in `.env`) has been removed. Each module now:

1. Declares its own driver in `manifest.storage`
2. Gets its own isolated storage instance
3. No more shared files or tables between modules

If no `storage` field is declared, the module defaults to `json` driver.
