/**
 * Seed all HTML files from amplify/static/content into the Amplify Storage bucket "images".
 *
 * For each file like my-content.html, this script uploads to Storage path:
 *   content/my-content   (note: file extension is removed)
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
 * - By default, skips upload if destination key already exists. Set OVERWRITE=1 to force re-upload.
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

const HTML_EXTS = new Set(['.html']);

function guessContentType(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case '.html':
      return 'text/html';
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

async function main() {
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  await tryLoadEnvLocalOnce(rootDir);

  const { SEED_USERNAME, SEED_PASSWORD } = process.env;
  if (!SEED_USERNAME || !SEED_PASSWORD) {
    throw new Error('SEED_USERNAME and SEED_PASSWORD must be set in environment');
  }

  await configureAmplifyFromOutputs();

  console.log('Signing in...');
  await signIn({ username: SEED_USERNAME, password: SEED_PASSWORD });
  const session = await fetchAuthSession();
  if (!session.userSub) {
    throw new Error('Could not get user sub from session');
  }
  console.log('Signed in as', session.userSub);

  const staticDir = join(rootDir, 'amplify', 'static', 'content');
  const forceFlag = process.argv.includes('-f') || process.argv.includes('--force');
  const overwrite = forceFlag;

  for await (const file of walk(staticDir)) {
    const ext = extname(file);
    if (!HTML_EXTS.has(ext)) continue;

    const key = basename(file, ext);
    const storagePath = `content/${key}`;

    try {
      if (!overwrite) {
        const props = await getProperties({ path: storagePath });
        if (props.size) {
          console.log(`[SKIP] ${storagePath} already exists`);
          continue;
        }
      }
    } catch (e: any) {
      if (e.name !== 'NotFound') {
        console.warn(`[WARN] Failed to check for ${storagePath}:`, e);
      }
    }

    const contentType = guessContentType(ext);
    if (!contentType) {
      console.warn(`[WARN] Skipping ${file}: unknown content type for extension ${ext}`);
      continue;
    }

    console.log(`[UPLOAD] ${file} -> ${storagePath}`);
    const fileContents = await fsReadFile(file);
    await uploadData({
      path: storagePath,
      data: fileContents,
      options: {
        contentType,
        // accessLevel: 'guest', // content is public
      },
    }).result;
  }

  await signOut();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
