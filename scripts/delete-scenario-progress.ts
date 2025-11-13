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

async function listAllScenariosProgress(client: ReturnType<typeof generateClient<Schema>>) {
  let nextToken: string | undefined = undefined;
  const items: any[] = [];
  do {
    const page: any = await client.models.UserScenarioProgress.list({ nextToken });
    items.push(...page.data);
    nextToken = (page as any).nextToken;
  } while (nextToken);
  return items;
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
  const progresses = await listAllScenariosProgress(client);
  console.log(progresses);
  console.log(`Found ${progresses.length} scenario progress entries to delete.`);
    for (const progress of progresses) {
        let res = await client.models.UserScenarioProgress.delete({ userId: progress.userId, scenarioNameId: progress.scenarioNameId });
        console.log(`- Deleted progress for userId=${progress.userId} scenarioNameId=${progress.scenarioNameId}`);
        console.log(res);
    }

}

// Execute
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
