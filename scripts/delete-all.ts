/**
 * Dynamic delete script: removes backend resources in a safe order.
 *
 * Strategy
 * - Prefer calling existing npm delete:* scripts via dotenvx wrapper
 *   (e.g., npx dotenvx run --env-file=.env.local -- npm run delete:scenarios -- -f)
 * - Then, clean up remaining models that don't have dedicated delete scripts
 *   using the Amplify Data client (LeaderboardEntry, UserScenarioProgress, global LibraryItem).
 *
 * Flags
 * - --force / -f: forwarded to sub delete scripts (when applicable)
 * - --dry-run: print planned actions without executing them
 */

import { readFile as fsReadFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

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

async function configureAmplifyFromOutputs() {
  const outputsUrl = new URL('../amplify_outputs.json', import.meta.url);
  const outputsRaw = await fsReadFile(outputsUrl, 'utf-8');
  const outputs = JSON.parse(outputsRaw);
  Amplify.configure(outputs);
}

async function listAll<T>(fn: (token?: string) => Promise<{ data: T[]; nextToken?: string | null }>): Promise<T[]> {
  const items: T[] = [];
  let token: string | undefined = undefined;
  do {
    const page = await fn(token);
    items.push(...page.data);
    token = (page as any).nextToken || undefined;
  } while (token);
  return items;
}

async function deleteModelItems(client: ReturnType<typeof generateClient<Schema>>, modelName: keyof typeof client.models) {
  const model = client.models[modelName] as any;
  const items = await listAll<any>((nextToken?: string) => model.list({ nextToken }));
  if (!items.length) return;
  console.log(`Deleting ${items.length} ${String(modelName)} record(s)...`);
  for (const it of items) {
    try {
      await model.delete({ id: it.id });
    } catch (e: any) {
      console.warn(`  - Failed to delete ${String(modelName)}#${it.id}: ${e?.message ?? e}`);
    }
  }
}

async function deleteGlobalLibraryItems(client: ReturnType<typeof generateClient<Schema>>) {
  const items = await listAll<any>((nextToken?: string) => (client.models as any).LibraryItem.list({ nextToken }));
  const globals = items.filter((it) => !it.scenarioId);
  if (!globals.length) return;
  console.log(`Deleting ${globals.length} global LibraryItem(s)...`);
  for (const it of globals) {
    try {
      await (client.models as any).LibraryItem.delete({ id: it.id });
    } catch (e: any) {
      console.warn(`  - Failed to delete LibraryItem#${it.id}: ${e?.message ?? e}`);
    }
  }
}

async function main() {
  const { force, dryRun } = parseArgs();

  // Discover scripts
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
  const pkgRaw = await fsReadFile(pkgPath, 'utf-8');
  const pkg: PkgJson = JSON.parse(pkgRaw);
  const scripts = pkg.scripts ?? {};

  // Preferred delete order: ensure scenarios are deleted early to clean up children via its deep delete script
  const deleteScripts = Object.keys(scripts)
    .filter((k) => k.startsWith('delete:'))
    .map((k) => k.replace(/^delete:/, ''));

  const plannedDeletes: string[] = [];
  if (deleteScripts.includes('scenarios')) plannedDeletes.push('scenarios');
  // Any additional delete:* scripts are appended after scenarios, stable-sorted for determinism
  for (const name of deleteScripts.sort()) {
    if (name === 'scenarios') continue;
    plannedDeletes.push(name);
  }

  // Execute delete scripts
  for (const name of plannedDeletes) {
    console.log(`Running delete:${name} ...`);
    const args = force ? ['-f'] : [];
    await runWrapped(`delete:${name}`, args, dryRun);
  }

  // Now delete remaining models that may not have dedicated delete scripts
  // Connect to Amplify and use Data client to clean up safe models
  await configureAmplifyFromOutputs();

  const username = process.env['SEED_USERNAME'];
  const password = process.env['SEED_PASSWORD'];
  if (!dryRun) {
    if (!username || !password) {
      console.error('Missing credentials. Please set SEED_USERNAME and SEED_PASSWORD in your environment.');
      process.exit(1);
    }
    await signIn({ username, password });
    const session = await fetchAuthSession();
    if (!session.tokens?.idToken) {
      console.error('Sign-in failed: no tokens returned.');
      process.exit(1);
    }
  }

  const client = generateClient<Schema>();

  // Delete user-generated tracking models first
  console.log('Cleaning user tracking models (UserScenarioProgress, LeaderboardEntry)...');
  if (!dryRun) {
    await deleteModelItems(client, 'UserScenarioProgress');
    await deleteModelItems(client, 'LeaderboardEntry');
  } else {
    console.log('[dry-run] would delete UserScenarioProgress and LeaderboardEntry items');
  }

  // Delete any remaining global library items (not tied to scenarios)
  console.log('Cleaning global LibraryItem(s)...');
  if (!dryRun) {
    await deleteGlobalLibraryItems(client);
  } else {
    console.log('[dry-run] would delete global LibraryItem items');
  }

  if (!dryRun) await signOut();

  console.log('\nDelete-all completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
