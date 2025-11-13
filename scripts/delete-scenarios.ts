/**
 * Delete all scenarios from the current Amplify backend.
 *
 * Auth: uses Cognito User Pools. Provide credentials via env:
 *   SEED_USERNAME, SEED_PASSWORD (dotenv supported via @dotenvx/dotenvx)
 *
 * Environment selection:
 * - This script reads Amplify config from amplify_outputs.json in the repo root.
 * - To seed Sandbox: ensure ampx sandbox is running so amplify_outputs.json points to Sandbox.
 * - To seed a branch env (qual/prod): checkout that branch (or pull outputs), then run this script.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

async function listAllScenarios(client: ReturnType<typeof generateClient<Schema>>) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.Scenario.list({ nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
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


async function deleteScenarioDeep(client: ReturnType<typeof generateClient<Schema>>, scenario: { nameId: string; card?: { title?: string | null } | null }) {
  // Delete children first, then the scenario
  const [nodes, indicators] = await Promise.all([
    listAllNodes(client, scenario.nameId),
    listAllIndicators(client, scenario.nameId)
  ]);

  await Promise.all(nodes.map(n => client.models.Node.delete({ id: n.id })));
  await Promise.all(indicators.map(i => client.models.Indicator.delete({ id: i.id })));

  await client.models.Scenario.delete({ nameId: scenario.nameId });
  console.log(`- Deleted: ${scenario.card?.title ?? scenario.nameId} [nameId=${scenario.nameId}]`);
}

async function main() {
  await configureAmplifyFromOutputs();

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

  console.log('Fetching all scenarios to delete...');
  const scenarios = await listAllScenarios(client);

  if (scenarios.length === 0) {
    console.log('No scenarios found to delete.');
    await signOut();
    return;
  }

  console.log(`Deleting ${scenarios.length} scenario(s) from current backend...`);
  const results = [] as Array<{ nameId: string; ok: boolean; error?: string }>;
  for (const scenario of scenarios) {
    try {
      const result = await deleteScenarioDeep(client as any, scenario);
      results.push({ nameId: scenario.nameId, ok: true });
    } catch (e: any) {
      results.push({ nameId: scenario.nameId, ok: false, error: e?.message ?? String(e) });
    }
  }

  await signOut();

  // Summary
  const ok = results.filter((r) => r.ok).length;
  const ko = results.length - ok;
  console.log(`\nDone. Success: ${ok}, Failed: ${ko}`);
  if (ko) {
    for (const r of results.filter((r) => !r.ok)) {
      console.error(`  - ${r.nameId}: ${r.error}`);
    }
    process.exitCode = 1;
  }
}

// Execute
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
