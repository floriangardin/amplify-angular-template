import { defineFunction, secret } from '@aws-amplify/backend';

export const listInvoices = defineFunction({
  name: 'list-invoices',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  },
});
