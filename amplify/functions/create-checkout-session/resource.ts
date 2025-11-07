import { defineFunction, secret } from '@aws-amplify/backend';

export const createCheckoutSession = defineFunction({
  name: 'create-checkout-session',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    STRIPE_PRICE_ID: secret('STRIPE_PRICE_ID'),
    SUCCESS_URL: secret('SUCCESS_URL'),
    CANCEL_URL: secret('CANCEL_URL'),
  },
});