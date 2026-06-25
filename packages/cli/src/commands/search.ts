import type { Command } from '../command.ts';

const REGISTRY_URL = 'https://raw.githubusercontent.com/Hydr46605/BiscottoRegistry/main/registry.json';

interface RegistryEntry {
  repo: string;
  description: string;
  tags?: string[];
  latest: string;
}

interface Registry {
  modules: Record<string, RegistryEntry>;
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

    const entries = Object.entries(registry.modules);

    if (entries.length === 0) {
      console.log('  No modules in registry.');
      return;
    }

    const filtered = query
      ? entries.filter(([name, entry]) =>
          name.includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.tags?.some((t) => t.includes(query))
        )
      : entries;

    if (filtered.length === 0) {
      console.log(`  No modules found matching "${query}".`);
      return;
    }

    console.log('');
    for (const [name, entry] of filtered) {
      const source = entry.repo.replace('https://github.com/', '');
      console.log(`  ${name}@${entry.latest}`);
      console.log(`    ${entry.description}`);
      console.log(`    ${source}`);
      if (entry.tags?.length) console.log(`    tags: ${entry.tags.join(', ')}`);
      console.log('');
    }

    console.log(`  ${filtered.length} module(s) found.`);
  },
};
