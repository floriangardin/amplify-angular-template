import Stripe from 'stripe';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

type Identity = {
  username?: string;
  claims?: Record<string, any>;
};

type Event = {
  identity?: Identity;
  request?: { headers?: Record<string, string | undefined> };
  arguments?: { email?: string };
};

export const handler = async (event: Event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY as string;
  if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');
  const stripe = new Stripe(stripeKey);

  // Determine subscription id from token claims or Cognito GetUser
  let subscriptionId = (event?.identity?.claims?.['custom:stripeSubscriptionId'] as string | undefined) || undefined;
  if (!subscriptionId) {
    const rawAuth = event?.request?.headers?.authorization;
    if (rawAuth) {
      const accessToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;
      const cognito = new CognitoIdentityProviderClient({});
      try {
        const res = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
        subscriptionId = res.UserAttributes?.find(a => a.Name === 'custom:stripeSubscriptionId')?.Value;
      } catch (err) {
        console.warn('Cognito GetUser failed:', err);
      }
    }
  }
  if (!subscriptionId) throw new Error('No Stripe subscription id on user');

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (!sub) throw new Error('Subscription not found');

  if ((sub.status === 'active' || sub.status === 'trialing') && sub.cancel_at_period_end) {
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    return 'ok';
  }
  if (sub.status === 'active' || sub.status === 'trialing') {
    return 'already_active';
  }
  throw new Error(`Subscription not in a state to reinstate: ${sub.status}`);
};
