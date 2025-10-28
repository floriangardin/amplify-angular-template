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
  console.log('Event identity:', event);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const priceId = process.env.STRIPE_PRICE_ID as string;
  const successUrl = process.env.SUCCESS_URL as string;
  const cancelUrl = process.env.CANCEL_URL as string;

  // 1) Try explicit arg (if you choose to pass it)
  // 2) Try ID/access token claims (ID token would have email)
  let customerEmail =
    event?.arguments?.email ||
    event?.identity?.claims?.email ||
    undefined;

  console.log('Customer email before Cognito check:', customerEmail);

  if (!customerEmail) {
    const rawAuth = event?.request?.headers?.authorization;
    if (rawAuth) {
      const accessToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;
      const cognito = new CognitoIdentityProviderClient({});
      try {
        const res = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
        const emailAttr = res.UserAttributes?.find(a => a.Name === 'email')?.Value;
        if (emailAttr) customerEmail = emailAttr;
        console.log('Customer email after Cognito check:', customerEmail);
      } catch (err) {
        console.warn('Cognito GetUser failed:', err);
      }
    }
  } 

  console.log('Customer email:', customerEmail);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    // Help us correlate session -> Cognito user
    client_reference_id: (event?.identity?.claims?.sub as string | undefined) || undefined,
    metadata: {
      cognito_sub: (event?.identity?.claims?.sub as string | undefined) || '',
      cognito_username: (event?.identity?.username as string | undefined) || '',
      email: customerEmail || '',
    },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error('No checkout session URL returned by Stripe');
  return session.url;
};