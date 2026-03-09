#!/usr/bin/env npx dotenvx run --env-file=.env.local -- tsx
/**
 * Clear leaderboard and user progress script: removes all LeaderboardEntry
 * and UserScenarioProgress records.
 *
 * Usage:
 *   npm run clear:leaderboard
 *   npm run clear:leaderboard -- --dry-run  # Preview what would be deleted
 *
 * Requires SEED_USERNAME and SEED_PASSWORD environment variables (admin credentials).
 */

import { readFile as fsReadFile } from 'node:fs/promises';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

async function configureAmplifyFromOutputs() {
  const outputsUrl = new URL('../amplify_outputs.json', import.meta.url);
  const outputsRaw = await fsReadFile(outputsUrl, 'utf-8');
  const outputs = JSON.parse(outputsRaw);
  Amplify.configure(outputs);
}

async function listAllLeaderboardEntries(
  client: ReturnType<typeof generateClient<Schema>>
): Promise<Array<{ userId: string; scenarioNameId: string; username: string; profit: number }>> {
  const items: Array<{ userId: string; scenarioNameId: string; username: string; profit: number }> = [];
  let nextToken: string | undefined = undefined;

  do {
    const page = await client.models.LeaderboardEntry.list({ nextToken });
    for (const entry of page.data) {
      if (entry) {
        items.push({
          userId: entry.userId,
          scenarioNameId: entry.scenarioNameId,
          username: entry.username,
          profit: entry.profit,
        });
      }
    }
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return items;
}

async function listAllUserProgress(
  client: ReturnType<typeof generateClient<Schema>>
): Promise<Array<{ userId: string; scenarioNameId: string; username: string }>> {
  const items: Array<{ userId: string; scenarioNameId: string; username: string }> = [];
  let nextToken: string | undefined = undefined;

  do {
    const page = await client.models.UserScenarioProgress.list({ nextToken });
    for (const entry of page.data) {
      if (entry) {
        items.push({
          userId: entry.userId,
          scenarioNameId: entry.scenarioNameId,
          username: entry.username,
        });
      }
    }
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return items;
}

async function main() {
  const { dryRun } = parseArgs();

  console.log('Configuring Amplify...');
  await configureAmplifyFromOutputs();

  const username = process.env['SEED_USERNAME'];
  const password = process.env['SEED_PASSWORD'];

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

  const client = generateClient<Schema>();

  // --- Leaderboard Entries ---
  console.log('\n--- Leaderboard Entries ---');
  console.log('Fetching leaderboard entries...');
  const leaderboardEntries = await listAllLeaderboardEntries(client);
  console.log(`Found ${leaderboardEntries.length} leaderboard entry(ies).`);

  // --- User Progress ---
  console.log('\n--- User Progress ---');
  console.log('Fetching user progress entries...');
  const progressEntries = await listAllUserProgress(client);
  console.log(`Found ${progressEntries.length} user progress entry(ies).`);

  if (leaderboardEntries.length === 0 && progressEntries.length === 0) {
    console.log('\nNothing to delete.');
    if (!dryRun) await signOut();
    return;
  }

  if (dryRun) {
    if (leaderboardEntries.length > 0) {
      console.log('\n[dry-run] Would delete leaderboard entries:');
      for (const entry of leaderboardEntries) {
        console.log(`  - ${entry.username} (${entry.userId}) - scenario: ${entry.scenarioNameId}, profit: ${entry.profit}`);
      }
    }
    if (progressEntries.length > 0) {
      console.log('\n[dry-run] Would delete user progress entries:');
      for (const entry of progressEntries) {
        console.log(`  - ${entry.username} (${entry.userId}) - scenario: ${entry.scenarioNameId}`);
      }
    }
    console.log('\n[dry-run] No changes made.');
    await signOut();
    return;
  }

  let leaderboardDeleted = 0;
  let leaderboardFailed = 0;
  let progressDeleted = 0;
  let progressFailed = 0;

  // Delete leaderboard entries
  if (leaderboardEntries.length > 0) {
    console.log('\nDeleting leaderboard entries...');
    for (const entry of leaderboardEntries) {
      try {
        // LeaderboardEntry uses composite identifier: [userId, scenarioNameId]
        await client.models.LeaderboardEntry.delete({
          userId: entry.userId,
          scenarioNameId: entry.scenarioNameId,
        });
        leaderboardDeleted++;
        console.log(`  ✓ Deleted: ${entry.username} - ${entry.scenarioNameId}`);
      } catch (e: any) {
        leaderboardFailed++;
        console.warn(`  ✗ Failed to delete ${entry.username} (${entry.userId}) - ${entry.scenarioNameId}: ${e?.message ?? e}`);
      }
    }
  }

  // Delete user progress entries
  if (progressEntries.length > 0) {
    console.log('\nDeleting user progress entries...');
    for (const entry of progressEntries) {
      try {
        // UserScenarioProgress uses composite identifier: [userId, scenarioNameId]
        await client.models.UserScenarioProgress.delete({
          userId: entry.userId,
          scenarioNameId: entry.scenarioNameId,
        });
        progressDeleted++;
        console.log(`  ✓ Deleted: ${entry.username} - ${entry.scenarioNameId}`);
      } catch (e: any) {
        progressFailed++;
        console.warn(`  ✗ Failed to delete ${entry.username} (${entry.userId}) - ${entry.scenarioNameId}: ${e?.message ?? e}`);
      }
    }
  }

  await signOut();

  console.log('\n--- Summary ---');
  console.log(`Leaderboard: ${leaderboardDeleted} deleted, ${leaderboardFailed} failed`);
  console.log(`User Progress: ${progressDeleted} deleted, ${progressFailed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
