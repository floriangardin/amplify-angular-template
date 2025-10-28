import Stripe from 'stripe';
import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

type Identity = {
  username?: string;
  claims?: Record<string, any>;
};

type Event = {
  identity?: Identity;
  request?: { headers?: Record<string, string | undefined> };
  arguments?: { sessionId?: string };
};

export const handler = async (event: Event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY as string;
  if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');
  const stripe = new Stripe(stripeKey);

  const sessionId = event?.arguments?.sessionId;
  if (!sessionId) throw new Error('Missing sessionId');

  // Retrieve checkout session to get subscription id
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const subField = session.subscription;
  if (!subField) throw new Error('No subscription found on session');
  const subscriptionId = typeof subField === 'string' ? subField : subField.id;

  // Update current user's custom attribute using their access token
  const rawAuth = event?.request?.headers?.authorization;
  if (!rawAuth) throw new Error('Missing Authorization header');
  const accessToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;

  const cognito = new CognitoIdentityProviderClient({});
  await cognito.send(
    new UpdateUserAttributesCommand({
      AccessToken: accessToken,
      UserAttributes: [
        { Name: 'custom:stripeSubscriptionId', Value: subscriptionId },
      ],
    })
  );

  return 'ok';
};
