import type { Command } from '../command.ts';

const REGISTRY_URL = 'https://raw.githubusercontent.com/Hydr46605/BiscottoRegistry/main/registry/modules.json';

interface ModuleEntry {
  name: string;
  description: string;
  author: { name: string; url?: string };
  repository: string;
  version: string;
  tags: string[];
  category: string;
  featured?: boolean;
  stable?: boolean;
}

interface Registry {
  version: number;
  modules: ModuleEntry[];
}

async function fetchRegistry(): Promise<Registry | null> {
  try {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) return null;
    return await res.json() as Registry;
  } catch {
    return null;
  }
}

export const searchCommand: Command = {
  name: 'search',
  description: 'Search for modules in the registry',
  usage: 'biscotto search <query>',
  async run(ctx) {
    const query = ctx.args.join(' ').toLowerCase();

    console.log('  Fetching registry...');
    const registry = await fetchRegistry();

    if (!registry) {
      console.error('  Error: could not fetch registry');
      console.error('  Make sure you have internet access.');
      process.exit(1);
    }

    if (registry.modules.length === 0) {
      console.log('  No modules in registry.');
      return;
    }

    const filtered = query
      ? registry.modules.filter((mod) =>
          mod.name.includes(query) ||
          mod.description.toLowerCase().includes(query) ||
          mod.tags.some((t) => t.includes(query)) ||
          mod.category.includes(query)
        )
      : registry.modules;

    if (filtered.length === 0) {
      console.log(`  No modules found matching "${query}".`);
      return;
    }

    console.log('');
    for (const mod of filtered) {
      const source = mod.repository.replace('https://github.com/', '');
      const badges = [
        mod.featured ? '★ featured' : '',
        mod.stable ? '' : '⚠ unstable',
      ].filter(Boolean).join(' · ');

      console.log(`  ${mod.name}@${mod.version}  [${mod.category}]${badges ? '  ' + badges : ''}`);
      console.log(`    ${mod.description}`);
      console.log(`    ${source}`);
      console.log(`    tags: ${mod.tags.join(', ')}`);
      console.log('');
    }

    console.log(`  ${filtered.length} module(s) found.`);
  },
};
