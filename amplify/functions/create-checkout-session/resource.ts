import { defineFunction } from '@aws-amplify/backend';

export const createCheckoutSession = defineFunction({
  name: 'create-checkout-session',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] as string,
    STRIPE_PRICE_ID: process.env['STRIPE_PRICE_ID'] as string,
    SUCCESS_URL: process.env['SUCCESS_URL'] as string,
    CANCEL_URL: process.env['CANCEL_URL'] as string,
  },
});