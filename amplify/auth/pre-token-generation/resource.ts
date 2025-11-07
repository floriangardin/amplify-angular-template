import { defineFunction, secret } from '@aws-amplify/backend';

export const preTokenGeneration = defineFunction({
  name: 'pre-token-generation',
  entry: './handler.ts',
  resourceGroupName: 'auth',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    VERIFY_SUBSCRIPTION: "true",
  }
});
