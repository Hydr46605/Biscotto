import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LitLogger } from './logger.js';
import type { ModuleLoader } from './loader.js';

interface ReloadSignal {
  module: string;
  ts: number;
}

/**
 * Wires up a polling daemon that consumes `.biscotto/reload.json` IPC
 * signals produced by the CLI's `biscotto reload <module>` command.
 *
 * Cross-platform, signal-free, file-based: the CLI writes
 * `reload.json.tmp` and atomically renames to `reload.json` (handled
 * in `cli/src/fs.ts#writeAtomicJson`). The poller reads the file,
 * parses the module name, and calls `ModuleLoader.reloadModule`.
 *
 * The polling timer is `unref()`'d so it does not prevent the process
 * from exiting cleanly during shutdown.
 */
export function setupHotReload(loader: ModuleLoader, root: string): void {
  const flagPath = resolve(root, '.biscotto', 'reload.json');
  let isProcessing = false;

  const poller = setInterval(async () => {
    if (isProcessing) return;
    if (!existsSync(flagPath)) return;

    isProcessing = true;
    try {
      const raw = readFileSync(flagPath, 'utf-8');
      // Consume immediately to avoid double-processing on subsequent ticks.
      try { unlinkSync(flagPath); } catch (err) {
        LitLogger.debug('HotReload', `Could not consume flag (will retry next tick): ${err}`);
      }

      let signal: ReloadSignal;
      try {
        signal = JSON.parse(raw) as ReloadSignal;
      } catch (err) {
        LitLogger.error('HotReload', `Invalid reload signal JSON: ${err}`);
        return;
      }

      if (!signal.module) {
        LitLogger.warn('HotReload', 'Reload signal missing module field; ignoring');
        return;
      }

      const mod = loader.getModuleInfo(signal.module);
      if (!mod) {
        LitLogger.warn('HotReload', `Module "${signal.module}" not loaded; nothing to reload`);
        return;
      }

      LitLogger.info('HotReload', `Reloading module: ${signal.module}`);
      const ok = await loader.reloadModule(signal.module);
      if (ok) {
        LitLogger.info('HotReload', `Module "${signal.module}" reloaded successfully`);
      } else {
        LitLogger.error('HotReload', `Module "${signal.module}" reload failed`);
      }
    } catch (err) {
      LitLogger.error('HotReload', `Failed to process reload signal: ${err}`);
      try { if (existsSync(flagPath)) unlinkSync(flagPath); } catch {}
    } finally {
      isProcessing = false;
    }
  }, 500);

  poller.unref();
  LitLogger.debug('HotReload', `Polling ${flagPath} every 500 ms`);
}

/**
 * Import a module with a cache-busting query parameter so Node.js
 * re-reads the file from disk instead of returning the cached copy.
 * Returns the default export or a named export matching the module name.
 */
export async function importFresh(modulePath: string): Promise<Record<string, unknown>> {
  const fileUrl = pathToFileURL(modulePath).href;
  const cacheBusted = `${fileUrl}?t=${Date.now()}`;
  return import(cacheBusted);
}
