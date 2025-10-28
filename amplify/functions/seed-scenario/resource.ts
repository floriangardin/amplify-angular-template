import { defineFunction } from '@aws-amplify/backend';

export const seedScenario = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'seed-scenario',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts',
  // Assign to data stack to avoid circular dependency
  resourceGroupName: 'data'
});