import { defineFunction } from '@aws-amplify/backend';

export const reinstateSubscription = defineFunction({
  name: 'reinstate-subscription',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] as string,
  },
});
