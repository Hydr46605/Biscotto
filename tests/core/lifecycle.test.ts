import { describe, it, expect, beforeEach } from 'vitest';
import {
  ModuleLifecycle,
  ModuleState,
} from '../../packages/core/src/kernel/lifecycle.ts';
import { ServiceRegistry } from '../../packages/core/src/kernel/services.ts';
import { ModuleData } from '../../packages/core/src/kernel/data.ts';
import { InMemoryStorage } from './_setup.ts';

function makeLifecycle(): ModuleLifecycle {
  const lc = new ModuleLifecycle();
  lc.setServices(new ServiceRegistry());
  lc.setClient({} as any);
  return lc;
}

describe('ModuleLifecycle', () => {
  let lc: ModuleLifecycle;

  beforeEach(() => {
    lc = makeLifecycle();
  });

  it('starts in DISCOVERED state', () => {
    lc.register('a', {});
    expect(lc.getState('a')).toBe(ModuleState.DISCOVERED);
  });

  it('transitions DISCOVERED -> LOADED -> ENABLED via enable()', async () => {
    const calls: string[] = [];
    lc.register('a', {
      onLoad: () => { calls.push('onLoad'); },
      onEnable: () => { calls.push('onEnable'); },
    });
    lc.setModuleData('a', new ModuleData(process.cwd(), 'a'));
    lc.setModuleStorage('a', new InMemoryStorage());

    const result = await lc.enable('a');
    expect(result).toBe(true);
    expect(lc.getState('a')).toBe(ModuleState.ENABLED);
    expect(calls).toEqual(['onLoad', 'onEnable']);
  });

  it('enable is idempotent', async () => {
    lc.register('a', {});
    lc.setModuleData('a', new ModuleData(process.cwd(), 'a'));
    lc.setModuleStorage('a', new InMemoryStorage());
    expect(await lc.enable('a')).toBe(true);
    expect(await lc.enable('a')).toBe(true);
    expect(lc.getState('a')).toBe(ModuleState.ENABLED);
  });

  it('disables enabled module and runs onDisable hook', async () => {
    const calls: string[] = [];
    lc.register('a', {
      onEnable: () => { calls.push('onEnable'); },
      onDisable: () => { calls.push('onDisable'); },
    });
    lc.setModuleData('a', new ModuleData(process.cwd(), 'a'));
    lc.setModuleStorage('a', new InMemoryStorage());

    await lc.enable('a');
    const result = await lc.disable('a');

    expect(result).toBe(true);
    expect(lc.getState('a')).toBe(ModuleState.DISABLED);
    expect(calls).toEqual(['onEnable', 'onDisable']);
  });

  it('unloads enabled module then transitions to UNLOADED', async () => {
    const calls: string[] = [];
    lc.register('a', {
      onEnable: () => { calls.push('onEnable'); },
      onDisable: () => { calls.push('onDisable'); },
      onUnload: () => { calls.push('onUnload'); },
    });
    lc.setModuleData('a', new ModuleData(process.cwd(), 'a'));
    lc.setModuleStorage('a', new InMemoryStorage());

    await lc.enable('a');
    await lc.unload('a');

    expect(lc.getState('a')).toBe(ModuleState.UNLOADED);
    expect(calls).toEqual(['onEnable', 'onDisable', 'onUnload']);
  });

  it('rejects invalid transitions', async () => {
    lc.register('a', {});
    // DISCOVERED -> ENABLED is not directly valid (must go through LOADED).
    const result = await lc.transition('a', ModuleState.UNLOADED);
    expect(result).toBe(false);
    expect(lc.getState('a')).not.toBe(ModuleState.UNLOADED);
  });

  it('transitions to ERROR on failed hook', async () => {
    lc.register('a', {
      onLoad: () => { throw new Error('boom'); },
    });
    await lc.transition('a', ModuleState.LOADED);
    expect(lc.getState('a')).toBe(ModuleState.ERROR);
  });
});
