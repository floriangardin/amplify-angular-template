/**
 * Orchestrate a full refresh of backend data: delete then reseed in the right order.
 *
 * Execution model
 * - Deletes using scripts/delete-all.ts (also dynamic) or available npm delete:* scripts
 * - Seeds by discovering npm seed:* scripts and running them in a stable, dependency-aware order
 *
 * Flags
 * - --force / -f: forwarded to all seed scripts (forces overwrite)
 * - --dry-run: print planned actions without executing them
 */

import { readFile as fsReadFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type PkgJson = { scripts?: Record<string, string> };

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    force: argv.includes('-f') || argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
  };
}

function runWrapped(scriptName: string, passArgs: string[], dryRun = false): Promise<void> {
  const cmd = 'npx';
  const args = [
    'dotenvx',
    'run',
    '--env-file=.env.local',
    '--',
    'npm',
    'run',
    scriptName,
    '--',
    ...passArgs,
  ];
  if (dryRun) {
    console.log(`[dry-run] ${cmd} ${args.join(' ')}`);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const { force, dryRun } = parseArgs();

  // Read package.json to discover available scripts
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
  const pkgRaw = await fsReadFile(pkgPath, 'utf-8');
  const pkg: PkgJson = JSON.parse(pkgRaw);
  const scripts = pkg.scripts ?? {};

  // 1) Delete phase
  const hasDeleteAll = !!scripts['delete:all'];
  if (hasDeleteAll) {
    console.log('Step 1/2: Deleting existing data (delete:all)...');
    const delArgs = force ? ['-f'] : [];
    await runWrapped('delete:all', delArgs, dryRun);
  } else {
    // Fallback: run any delete:* discovered
    const deleteScripts = Object.keys(scripts)
      .filter((k) => k.startsWith('delete:'))
      .map((k) => k.replace(/^delete:/, ''));
    const plannedDeletes: string[] = [];
    if (deleteScripts.includes('scenarios')) plannedDeletes.push('scenarios');
    for (const name of deleteScripts.sort()) {
      if (name === 'scenarios') continue;
      plannedDeletes.push(name);
    }
    for (const name of plannedDeletes) {
      console.log(`Step 1/2: Deleting via delete:${name} ...`);
      const delArgs = force ? ['-f'] : [];
      await runWrapped(`delete:${name}`, delArgs, dryRun);
    }
  }

  // 2) Seed phase in dependency-aware order
  // Define preferred order; unknown seeds go before 'scenarios' but after known prerequisites
  const preferredOrder = ['library', 'content', 'static-images', 'images', 'scenarios'];
  const seedScripts = Object.keys(scripts)
    .filter((k) => k.startsWith('seed:'))
    .map((k) => k.replace(/^seed:/, ''));

  const known: string[] = [];
  for (const name of preferredOrder) if (seedScripts.includes(name)) known.push(name);
  const unknown = seedScripts.filter((n) => !preferredOrder.includes(n)).sort();

  // Insert unknowns before scenarios (if scenarios is present)
  const finalSeeds: string[] = [];
  for (const n of known) {
    if (n === 'scenarios' && unknown.length) finalSeeds.push(...unknown);
    finalSeeds.push(n);
  }
  // If there is no scenarios step, still append unknowns at the end
  if (!known.includes('scenarios') && unknown.length) finalSeeds.push(...unknown);

  console.log('Step 2/2: Seeding in order:', finalSeeds.join(' -> '));
  for (const name of finalSeeds) {
    const args = force ? ['-f'] : [];
    await runWrapped(`seed:${name}`, args, dryRun);
  }

  console.log('\nRefresh completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
