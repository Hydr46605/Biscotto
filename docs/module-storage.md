# Module Storage & Data

Each module gets its own isolated data directory for configuration, databases, images, and any other files.

## Directory Structure

```
.biscotto/
  configs/
    Shop/
      config.json         # structured config (schema + defaults)
      logo.png            # free files (images, cards, data, etc.)
    Moderation/
      config.json
  data/
    Shop/
      store.json          # key-value storage (json driver)
    Economia/
      store.db            # sqlite database
  modules/
    shop/
      biscotto.json
      dist/
        index.js
```

## Data Directory

Every module receives a `ModuleData` instance via `ctx.data` in lifecycle hooks.

### Structured Config

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
    const cfg = ctx.data.loadConfig(config.schema, config.defaults);
    ctx.logger.info(`Tax rate: ${cfg.taxRate}`);

    const rate = ctx.data.getConfig<number>('taxRate');
    ctx.data.setConfig('taxRate', 0.15);

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
    ctx.data.writeFile('logo.png', imageBuffer);
    ctx.data.writeFile('data.json', JSON.stringify({ items: [] }));

    const image = ctx.data.readBuffer('logo.png');
    const text = ctx.data.readFile('data.json');

    if (ctx.data.fileExists('logo.png')) {
      // ...
    }

    const files = ctx.data.listFiles();
    ctx.data.deleteFile('old-file.txt');
  },
});
```

## Isolated Storage

Each module declares its own storage driver in the manifest. Storage is fully isolated — each module gets its own file, database, or table.

### Declaring Storage

```typescript
export const manifest: ModuleManifest = {
  name: 'Shop',
  version: '1.0.0',
  storage: { driver: 'sqlite' },
};
```

### Available Drivers

| Driver | Location | Best For |
|--------|----------|----------|
| `json` | `.biscotto/data/<Module>/store.json` | Simple key-value, small data |
| `sqlite` | `.biscotto/data/<Module>/store.db` | Structured data, queries |
| `yaml` | `.biscotto/data/<Module>/store.yaml` | Human-readable config |
| `mysql` | Table `<Module>_store` in shared DB | Production, high traffic |

### Using Storage

```typescript
export default defineModule({
  manifest,
  onLoad(ctx) {
    await ctx.storage.set('user:123', { name: 'Mario', coins: 100 });
    const user = await ctx.storage.get<{ name: string; coins: number }>('user:123');
    const exists = await ctx.storage.has('user:123');
    await ctx.storage.delete('user:123');

    const all = await ctx.storage.all();
    await ctx.storage.clear();
  },
});
```

### Exposing Storage to Other Modules

Modules can expose their storage via the service registry:

```typescript
// modules/economia/index.ts
export default defineModule({
  manifest: { name: 'Economia', storage: { driver: 'sqlite' }, provides: ['economia-db'] },
  onLoad(ctx) {
    ctx.services.provide('economia-db', ctx.storage, 'Economia');
  },
});

// modules/shop/index.ts
export default defineModule({
  manifest: { name: 'Shop', storage: { driver: 'sqlite' }, requires: ['economia-db'] },
  onLoad(ctx) {
    const econDB = ctx.services.require<StorageProvider>('economia-db');
    const balance = await econDB.get<number>('user:123:coins');
  },
});
```

## MySQL — Shared Pool

When multiple modules use MySQL, they share a single connection pool:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=biscotto
```

Each module gets its own table: `<ModuleName>_store`. No conflicts, no extra connections.

## CLI Commands

```bash
biscotto config Shop              # show all config values
biscotto config Shop taxRate      # show specific value
biscotto config Shop taxRate 0.15 # set a value
biscotto config Shop --files      # list files in module data dir
biscotto status                   # shows storage driver per module
biscotto status Shop              # shows storage info for Shop
```

## Migration from Global Storage

The old global `StorageManager` (configured via `STORAGE_DRIVER` in `.env`) has been removed. Each module now:

1. Declares its own driver in `manifest.storage`
2. Gets its own isolated storage instance
3. No more shared files or tables between modules

If no `storage` field is declared, the module defaults to `json` driver.
