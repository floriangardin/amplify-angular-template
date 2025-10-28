import { defineFunction } from '@aws-amplify/backend';

export const preTokenGeneration = defineFunction({
  name: 'pre-token-generation',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  environment: {
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] as string,
    VERIFY_SUBSCRIPTION: process.env['VERIFY_SUBSCRIPTION'] as string,
  }
});
