import { defineFunction, secret } from '@aws-amplify/backend';

export const verifySubscription = defineFunction({
  name: 'verify-subscription',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  },
});
