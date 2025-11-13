/**
 * Seed all static image files from amplify/static/static_images into the Amplify Storage bucket "images".
 *
 * For each file like org_chart.png, this script uploads to Storage path:
 *   static_images/org_chart.png  (note: extension is preserved)
 *
 * Auth: uses Cognito User Pools. Provide credentials via env:
 *   SEED_USERNAME, SEED_PASSWORD (dotenv supported via @dotenvx/dotenvx)
 *
 * Environment selection:
 * - Reads Amplify config from amplify_outputs.json in the repo root.
 * - To seed Sandbox: ensure ampx sandbox is running so amplify_outputs.json points to Sandbox.
 * - To seed a branch env (qual/prod): use the corresponding amplify_outputs.json for that env.
 *
 * Idempotency:
 * - By default, skips upload if destination key already exists. Set OVERWRITE=1 or pass -f/--force to re-upload.
 */

import { readdir, readFile as fsReadFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { getProperties, uploadData } from 'aws-amplify/storage';

// Resolve amplify_outputs.json relative to this file using URL to also work with tsx ESM
async function configureAmplifyFromOutputs() {
  const outputsUrl = new URL('../amplify_outputs.json', import.meta.url);
  const outputsRaw = await fsReadFile(outputsUrl, 'utf-8');
  const outputs = JSON.parse(outputsRaw);
  Amplify.configure(outputs);
}

function stripQuotes(v: string) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

async function tryLoadEnvLocalOnce(rootDir: string) {
  const envPath = join(rootDir, '.env.local');
  if (!existsSync(envPath)) return false;
  try {
    const raw = await fsReadFile(envPath, 'utf-8');
    let count = 0;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = stripQuotes(trimmed.slice(eq + 1));
      if (!process.env[key as keyof NodeJS.ProcessEnv]) {
        process.env[key as keyof NodeJS.ProcessEnv] = val;
        count++;
      }
    }
    return count > 0;
  } catch {
    // ignore failures; runner mode may be preferred
  }
  return false;
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function guessContentType(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return undefined;
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

async function objectExists(path: string): Promise<boolean> {
  try {
    await getProperties({ path });
    return true;
  } catch (e: any) {
    const msg: string = e?.name || e?.message || '';
    if (msg.includes('NotFound') || msg.includes('NoSuchKey') || msg.includes('404')) return false;
    if (msg.includes('AccessDenied')) return false;
    return false;
  }
}

async function main() {
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  await tryLoadEnvLocalOnce(rootDir);
  await configureAmplifyFromOutputs();

  const username = process.env['SEED_USERNAME'];
  const password = process.env['SEED_PASSWORD'];
  const forceFlag = process.argv.includes('-f') || process.argv.includes('--force');
  const overwrite = forceFlag;

  if (!username || !password) {
    console.error('Missing credentials. Please set SEED_USERNAME and SEED_PASSWORD in your environment.');
    process.exit(1);
  }

  console.log('Signing in...');
  await signIn({ username, password });
  const session = await fetchAuthSession();
  if (!session.tokens?.idToken) {
    console.error('Sign-in failed: no tokens returned.');
    process.exit(1);
  }

  const imagesDir = join(rootDir, 'amplify', 'static', 'static_images');

  // Gather all image files (recursive)
  const candidates: string[] = [];
  for await (const fp of walk(imagesDir)) {
    const ext = extname(fp).toLowerCase();
    if (IMAGE_EXTS.has(ext)) candidates.push(fp);
  }

  if (candidates.length === 0) {
    console.warn('No image files found in amplify/static/static_images');
    await signOut();
    return;
  }

  console.log(`Seeding ${candidates.length} static image(s) into Storage bucket "images" under static_images/* ...`);

  let success = 0;
  const failures: Array<{ file: string; error: string }> = [];

  for (const filePath of candidates) {
    const nameWithExt = basename(filePath); // preserve extension
    const destPath = `static_images/${nameWithExt}`;
    const contentType = guessContentType(extname(filePath));
    try {
      if (!overwrite) {
        const exists = await objectExists(destPath);
        if (exists) {
          console.log(`- Skipped (exists): ${destPath}`);
          success++;
          continue;
        }
      }

      const data = await fsReadFile(filePath);
      const { result } = await uploadData({
        path: destPath,
        data,
        options: contentType ? { contentType } : undefined,
      });
      await result; // wait for completion
      console.log(`- Uploaded: ${destPath}${contentType ? ` (${contentType})` : ''}`);
      success++;
    } catch (e: any) {
      failures.push({ file: filePath, error: e?.message ?? String(e) });
      console.error(`- Failed: ${destPath} -> ${e?.message ?? e}`);
    }
  }

  await signOut();

  console.log(`\nDone. Success: ${success}, Failed: ${failures.length}`);
  if (failures.length) {
    for (const f of failures) {
      console.error(`  - ${f.file}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

// Execute
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
