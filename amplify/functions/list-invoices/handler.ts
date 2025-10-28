import Stripe from 'stripe';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

type Identity = {
  claims?: Record<string, any>;
};

type Event = {
  identity?: Identity;
  request?: { headers?: Record<string, string | undefined> };
};

export const handler = async (event: Event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY as string;
  if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');
  const stripe = new Stripe(stripeKey);

  // Get subscription id from claims or fetch via access token
  let subscriptionId = (event?.identity?.claims?.['custom:stripeSubscriptionId'] as string | undefined) || undefined;
  if (!subscriptionId) {
    const rawAuth = event?.request?.headers?.authorization;
    if (rawAuth) {
      const accessToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;
      const cognito = new CognitoIdentityProviderClient({});
      try {
        const res = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
        subscriptionId = res.UserAttributes?.find(a => a.Name === 'custom:stripeSubscriptionId')?.Value;
      } catch {}
    }
  }
  if (!subscriptionId) return [];

  // Retrieve last 3 invoices for the subscription
  const invoices = await stripe.invoices.list({ subscription: subscriptionId, limit: 3 });
  return invoices.data.map(inv => ({
    id: inv.id,
    number: inv.number || '',
    hostedInvoiceUrl: inv.hosted_invoice_url || '',
    invoicePdf: inv.invoice_pdf || '',
    currency: inv.currency || 'usd',
    total: inv.total || 0,
    created: inv.created ? new Date(inv.created * 1000).toISOString() : '',
    status: inv.status || 'open',
  }));
};
