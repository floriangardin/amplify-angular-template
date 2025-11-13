/**
 * Seed all scenario JSON files from amplify/static/scenarios into the current Amplify backend.
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
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

// Resolve amplify_outputs.json relative to this file using URL to also work with tsx ESM
async function configureAmplifyFromOutputs() {
  const outputsUrl = new URL('../amplify_outputs.json', import.meta.url);
  const outputsRaw = await readFile(outputsUrl, 'utf-8');
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
    const raw = await readFile(envPath, 'utf-8');
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

type DemoJson = {
  // minimal shape needed by seeding logic
  nameId: string;
  medals?: Array<{ name: 'gold' | 'silver' | 'bronze'; threshold: number }>;
  library?: Array<{
    nameId: string;
    description?: string;
    title: string;
    emoji: string;
  }>;
  card: {
    plan: 'free' | 'pro';
    title: string;
    shortDescription: string;
    difficulty: string;
    skillsAcquired: string[];
    context: {
      program: string;
      domains: string;
      roleFocus: string;
      objective: string;
    };
    metadata: {
      category: string;
      estimatedDurationMinutes: number;
      track: string;
    };
  };
  nodes?: Array<any>;
  indicators?: Array<any>;
};

function toChoices(choicesObj: any | undefined): any[] {
  if (!choicesObj) return [] as any[];
  const arr = Array.isArray(choicesObj)
    ? choicesObj
    : typeof choicesObj === 'object'
    ? Object.values(choicesObj)
    : [];
  return arr.map((c: any) => ({
    name: String(c.name),
    text: String(c.text),
    outcome: {
      description: String(c.outcome?.description ?? ''),
      impact: {
        dataQuality: Number(c.outcome?.impact?.dataQuality ?? 0),
        stakeholderTrust: Number(c.outcome?.impact?.stakeholderTrust ?? 0),
        profit: Number(c.outcome?.impact?.profit ?? 0),
      },
      next: Array.isArray(c.outcome?.next) ? (c.outcome?.next as string[]) : [],
    },
  }));
}

async function listAllNodes(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.Node.list({ filter: { scenarioId: { eq: scenarioId } }, nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
}

async function listAllIndicators(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.Indicator.list({ filter: { scenarioId: { eq: scenarioId } }, nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
}

async function listAllLibraryItems(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.LibraryItem.list({ filter: { scenarioId: { eq: scenarioId } }, nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
}


async function deleteScenarioDeep(client: ReturnType<typeof generateClient<Schema>>, scenarioNameId: string) {
  // Delete children first, then the scenario
  const [nodes, indicators, libs] = await Promise.all([
    listAllNodes(client, scenarioNameId),
    listAllIndicators(client, scenarioNameId),
    listAllLibraryItems(client, scenarioNameId),
  ]);

  await Promise.all(nodes.map(n => client.models.Node.delete({ id: n.id })));
  await Promise.all(indicators.map(i => client.models.Indicator.delete({ id: i.id })));
  await Promise.all(libs.map(l => client.models.LibraryItem.delete({ id: l.id })));

  await client.models.Scenario.delete({ nameId: scenarioNameId });
}

async function seedScenarioFile(client: ReturnType<typeof generateClient<Schema>>, filePath: string, force = false) {
  const raw = await readFile(filePath, 'utf-8');
  const payload = JSON.parse(raw) as DemoJson;

  // idempotency: skip if a Scenario with same title exists
  const existing = await client.models.Scenario.list({
    filter: { nameId: { eq: payload.nameId } },
  });

  if (existing.data.length > 0) {
    if (!force) {
      const s = existing.data[0]!;
      console.log(`- Skipped (exists): ${payload.card.title} [id=${s.nameId}]`);
      return s;
    }
    // Force: delete all matching scenarios and their children
    for (const s of existing.data) {
      await deleteScenarioDeep(client, s.nameId);
      console.log(`- Deleted existing: ${payload.card.title} [id=${s.nameId}]`);
    }
  }

  
  // Create Scenario
  const { data: scenario, errors: scenarioErrors } = await client.models.Scenario.create({
    nameId: payload.nameId,
    card: payload.card,
    medals: Array.isArray(payload.medals) ? payload.medals.map(m => ({ name: m.name, threshold: Number(m.threshold) })) : []
  });

  

  if (scenarioErrors?.length || !scenario) {
    const msg = scenarioErrors?.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ') || 'Unknown error creating Scenario';
    throw new Error(msg);
  }

  const scenarioNameId = scenario.nameId;
  // We need scenario-scoped library items before creating nodes so hints can be included at creation time (no update required).

  // Create Indicators
  const indicatorResults = await Promise.all(
    (payload.indicators ?? []).map((ind: any) =>
      client.models.Indicator.create({
        scenarioId: scenarioNameId,
        name: ind.name,
        emoji: ind.emoji,
        initial: ind.initial,
        min: ind.min,
        max: ind.max,
        nameId: ind.nameId,
        type: ind.type as any,
        displayed: Boolean(ind.displayed),
        color: ind.color,
      })
    )
  );

  const indicatorErrors = indicatorResults.flatMap((r) => r.errors ?? []);
  if (indicatorErrors.length) {
    const msg = indicatorErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create Indicators: ${msg}`);
  }

  // Link Library items (optional)
  if (Array.isArray(payload.library) && payload.library.length) {
    for (const libRef of payload.library) {
      const nameId = String(libRef.nameId);
      // Try to find a global library item (no scenarioId) with this nameId
      const { data: existingByName } = await client.models.LibraryItem.list({
        filter: { nameId: { eq: nameId } },
      });

      const global = existingByName.find((it: any) => !it.scenarioId);
      const description = libRef.description ?? global?.description ?? nameId;
      const title = libRef.title ?? global?.title ?? nameId;
      const emoji = libRef.emoji ?? global?.emoji ?? '📄';

      const { errors } = await client.models.LibraryItem.create({
        scenarioId: scenarioNameId,
        nameId,
        description,
        title,
        emoji,


      });
      if (errors?.length) {
        const msg = errors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
        throw new Error(`Failed to link LibraryItem '${nameId}' to Scenario: ${msg}`);
      }
    }
  }
  // Create Nodes including validated hints (no update needed -> avoids authorization on update)
  const scenarioLibItems = await listAllLibraryItems(client as any, scenarioNameId);
  const scenarioLibNameIds = new Set<string>(scenarioLibItems.map((it: any) => String(it.nameId)));

  for (const n of (payload.nodes ?? [])) {
    // Validate hints: allow only nameIds that exist either in scenario library or as a global library item
    let validHints: string[] = [];
    if (Array.isArray(n.hints) && n.hints.length) {
      for (const raw of n.hints) {
        const nameId = String(raw);
        let ok = scenarioLibNameIds.has(nameId);
        if (!ok) {
          const { data: globalLookup } = await client.models.LibraryItem.list({ filter: { nameId: { eq: nameId } } });
            ok = globalLookup.some((it: any) => !it.scenarioId);
        }
        if (ok) validHints.push(nameId);
      }
    }
    const { data: nodeCreated, errors: nodeErrors } = await client.models.Node.create({
      scenarioId: scenarioNameId,
      name: n.name,
      end: Boolean(n.end),
      default: Boolean(n.default ?? false),
      sender: n.sender,
      title: n.title,
      content: n.content,
      category: n.category as any,
      isUrgent: Boolean(n.isUrgent),
      choices: toChoices(n.choices) as any,
      hints: validHints as any,
    });
    if (nodeErrors?.length || !nodeCreated) {
      const msg = nodeErrors?.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
      throw new Error(`Failed to create Node '${n.name}': ${msg}`);
    }
  }


  console.log(`- Seeded: ${payload.card.title} [id=${scenarioNameId}]`);
  return scenario;
}

async function main() {
  await configureAmplifyFromOutputs();

  // In case the runner didn't inject envs, try to load .env.local from repo root.
  const username = process.env['SEED_USERNAME']
  const password = process.env['SEED_PASSWORD']
  if (!username || !password) {
    console.error('Missing credentials. Please set SEED_USERNAME and SEED_PASSWORD in your environment.');
    process.exit(1);
  }

  // Sign in to obtain Cognito tokens for authenticated model mutations
  await signIn({ username, password });
  const session = await fetchAuthSession();
  if (!session.tokens?.idToken) {
    console.error('Sign-in failed: no tokens returned.');
    process.exit(1);
  }

  const client = generateClient<Schema>();

  const forceFlag = process.argv.includes('-f') || process.argv.includes('--force');

  // Find all JSON scenario files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = __filename.substring(0, __filename.lastIndexOf('/'));
  const scenariosDir = join(__dirname, '../amplify/static/scenarios');
  const files = await readdir(scenariosDir);
  const scenarioFiles = files
    .filter((f) => extname(f).toLowerCase() === '.json')
    .map((f) => join(scenariosDir, f));

  if (scenarioFiles.length === 0) {
    console.warn('No scenario JSON files found in amplify/static/scenarios');
    await signOut();
    return;
  }

  console.log(`Seeding ${scenarioFiles.length} scenario(s) into current backend${forceFlag ? ' (force overwrite)' : ''}...`);

  const results = [] as Array<{ file: string; ok: boolean; error?: string }>;
  for (const file of scenarioFiles) {
    try {
  await seedScenarioFile(client as any, file, forceFlag);
      results.push({ file, ok: true });
    } catch (e: any) {
      results.push({ file, ok: false, error: e?.message ?? String(e) });
    }
  }

  await signOut();

  // Summary
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

// Execute
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
