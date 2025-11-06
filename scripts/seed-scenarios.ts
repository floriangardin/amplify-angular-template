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
  title: string;
  scenarioTitle: string;
  gameTitle: string;
  headerGameText: string;
  plan: string;
  role: string;
  introText: string;
  description: string;
  cdoRole: string;
  startTutorial: string;
  logo: { assetId: string };
  logoCompany: { assetId: string };
  logoId: string;
  nodes?: Array<any>;
  indicators?: Array<any>;
  termsLinks?: Array<any>;
  endResources?: Array<any>;
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

async function listAllTermLinks(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.TermLink.list({ filter: { scenarioId: { eq: scenarioId } }, nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
}

async function listAllEndResources(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.EndResource.list({ filter: { scenarioId: { eq: scenarioId } }, nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
}

async function deleteScenarioDeep(client: ReturnType<typeof generateClient<Schema>>, scenarioId: string) {
  // Delete children first, then the scenario
  const [nodes, indicators, termLinks, endResources] = await Promise.all([
    listAllNodes(client, scenarioId),
    listAllIndicators(client, scenarioId),
    listAllTermLinks(client, scenarioId),
    listAllEndResources(client, scenarioId),
  ]);

  await Promise.all(nodes.map(n => client.models.Node.delete({ id: n.id })));
  await Promise.all(indicators.map(i => client.models.Indicator.delete({ id: i.id })));
  await Promise.all(termLinks.map(t => client.models.TermLink.delete({ id: t.id })));
  await Promise.all(endResources.map(e => client.models.EndResource.delete({ id: e.id })));

  await client.models.Scenario.delete({ id: scenarioId });
}

async function seedScenarioFile(client: ReturnType<typeof generateClient<Schema>>, filePath: string, force = false) {
  const raw = await readFile(filePath, 'utf-8');
  const payload = JSON.parse(raw) as DemoJson;

  // idempotency: skip if a Scenario with same title exists
  const existing = await client.models.Scenario.list({
    filter: { title: { eq: payload.title } },
  });

  if (existing.data.length > 0) {
    if (!force) {
      const s = existing.data[0]!;
      console.log(`- Skipped (exists): ${payload.title} [id=${s.id}]`);
      return s;
    }
    // Force: delete all matching scenarios and their children
    for (const s of existing.data) {
      await deleteScenarioDeep(client, s.id);
      console.log(`- Deleted existing: ${payload.title} [id=${s.id}]`);
    }
  }

  // Create Scenario
  const { data: scenario, errors: scenarioErrors } = await client.models.Scenario.create({
    name: (payload as any).name, // optional
    title: payload.title,
    scenarioTitle: payload.scenarioTitle,
    gameTitle: payload.gameTitle,
    headerGameText: payload.headerGameText,
    plan: payload.plan,
    role: payload.role,
    introText: payload.introText,
    description: payload.description,
    cdoRole: payload.cdoRole,
    startTutorial: payload.startTutorial,
    logo: { assetId: payload.logo.assetId },
    logoCompany: { assetId: payload.logoCompany.assetId },
    logoId: payload.logoId,
  });

  if (scenarioErrors?.length || !scenario) {
    const msg = scenarioErrors?.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ') || 'Unknown error creating Scenario';
    throw new Error(msg);
  }

  const scenarioId = scenario.id;

  // Create Nodes
  const nodeResults = await Promise.all(
    (payload.nodes ?? []).map((n: any) =>
      client.models.Node.create({
        scenarioId,
        name: n.name,
        end: Boolean(n.end),
        default: Boolean(n.default ?? false),
        sender: n.sender,
        title: n.title,
        content: n.content,
        category: n.category as any,
        isUrgent: Boolean(n.isUrgent),
        choices: toChoices(n.choices) as any,
      })
    )
  );

  const nodeErrors = nodeResults.flatMap((r) => r.errors ?? []);
  if (nodeErrors.length) {
    const msg = nodeErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create Nodes: ${msg}`);
  }

  // Create Indicators
  const indicatorResults = await Promise.all(
    (payload.indicators ?? []).map((ind: any) =>
      client.models.Indicator.create({
        scenarioId,
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

  // Create Term Links
  const termLinkResults = await Promise.all(
    (payload.termsLinks ?? []).map((t: any) =>
      client.models.TermLink.create({
        scenarioId,
        name: t.name,
        text: t.text,
        href: t.href,
        source: t.source as any,
      })
    )
  );

  const termLinkErrors = termLinkResults.flatMap((r) => r.errors ?? []);
  if (termLinkErrors.length) {
    const msg = termLinkErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create TermLinks: ${msg}`);
  }

  // Create End Resources
  const endResourceResults = await Promise.all(
    (payload.endResources ?? []).map((e: any) =>
      client.models.EndResource.create({
        scenarioId,
        name: e.name,
        text: e.text,
        href: e.href,
        source: (e as any).source ?? 'local',
      })
    )
  );

  const endResourceErrors = endResourceResults.flatMap((r) => r.errors ?? []);
  if (endResourceErrors.length) {
    const msg = endResourceErrors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ');
    throw new Error(`Failed to create EndResources: ${msg}`);
  }

  console.log(`- Seeded: ${payload.title} [id=${scenarioId}]`);
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
