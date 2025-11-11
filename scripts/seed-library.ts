/**
 * Seed all library JSON files from amplify/static/library into the current Amplify backend.
 *
 * Auth: uses Cognito User Pools. Provide credentials via env:
 *   SEED_USERNAME, SEED_PASSWORD (dotenv supported via @dotenvx/dotenvx)
 *
 * Environment selection:
 * - This script reads Amplify config from amplify_outputs.json in the repo root.
 * - To seed Sandbox: ensure ampx sandbox is running so amplify_outputs.json points to Sandbox.
 * - To seed a branch env (qual/prod): checkout that branch (or pull outputs), then run this script.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

async function configureAmplifyFromOutputs() {
  const outputsUrl = new URL('../amplify_outputs.json', import.meta.url);
  const outputsRaw = await readFile(outputsUrl, 'utf-8');
  const outputs = JSON.parse(outputsRaw);
  Amplify.configure(outputs);
}

async function seedLibraryFile(client: ReturnType<typeof generateClient<Schema>>, filePath: string, force = false) {
  const raw = await readFile(filePath, 'utf-8');
  const payload = JSON.parse(raw) as { nameId: string; description: string; title: string; emoji: string };
  // Find existing entries with same nameId (could include scenario-bound items)
  const { data: existing, errors: err } = await client.models.LibraryItem.list({
    filter: { nameId: { eq: payload.nameId } },
  });

  // Prefer global item: no scenarioId set
  for(const global of existing) {
    if (global && !force) {
        console.log(`- Skipped (exists): ${payload.nameId} [id=${global.id}]`);
        return global;
    }

    if (global && force) {
        await client.models.LibraryItem.delete({ id: global.id });
        console.log(`- Deleted existing global: ${payload.nameId} [id=${global.id}]`);
    }
  }

  
  const { data: created, errors } = await client.models.LibraryItem.create({
    nameId: payload.nameId,
    description: payload.description,
    title: payload.title,
    emoji: payload.emoji,
  });

  if (errors?.length || !created) {
    const msg = errors?.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ') || 'Unknown error creating LibraryItem';
    throw new Error(msg);
  }

  console.log(`- Seeded library: ${payload.nameId} [id=${created.id}]`);
  return created;
}

async function main() {
  await configureAmplifyFromOutputs();

  const username = process.env['SEED_USERNAME'];
  const password = process.env['SEED_PASSWORD'];
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

  const client = generateClient<Schema>();

  const forceFlag = process.argv.includes('-f') || process.argv.includes('--force');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = __filename.substring(0, __filename.lastIndexOf('/'));
  const libDir = join(__dirname, '../amplify/static/library');
  const files = await readdir(libDir);
  const jsonFiles = files.filter((f) => extname(f).toLowerCase() === '.json').map((f) => join(libDir, f));

  if (jsonFiles.length === 0) {
    console.warn('No library JSON files found in amplify/static/library');
    await signOut();
    return;
  }

  console.log(`Seeding ${jsonFiles.length} library item(s) into current backend${forceFlag ? ' (force overwrite)' : ''}...`);

  const results: Array<{ file: string; ok: boolean; error?: string }> = [];
  for (const file of jsonFiles) {
    try {
      await seedLibraryFile(client as any, file, forceFlag);
      results.push({ file, ok: true });
    } catch (e: any) {
      results.push({ file, ok: false, error: e?.message ?? String(e) });
    }
  }

  await signOut();

  const ok = results.filter((r) => r.ok).length;
  const ko = results.length - ok;
  console.log(`\nDone. Success: ${ok}, Failed: ${ko}`);
  if (ko) {
    for (const r of results.filter((r) => !r.ok)) {
      console.error(`  - ${r.file}: ${r.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
