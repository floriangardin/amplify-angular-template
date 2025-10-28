import { defineFunction } from '@aws-amplify/backend';

export const listInvoices = defineFunction({
  name: 'list-invoices',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] as string,
  },
});
