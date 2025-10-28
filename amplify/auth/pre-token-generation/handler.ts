import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  // AdminListGroupsForUserCommand, // removed: no longer needed
} from '@aws-sdk/client-cognito-identity-provider';
import Stripe from 'stripe';

/**
 * Pre-token generation trigger to set default user attributes
 * This trigger fires on every authentication, including social logins
 * Sets planName to 'free' by default for users who don't have it set
 * Note: We don't override token groups to preserve existing roles (e.g., admin).
 *       We add plan info as custom claims instead.
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const client = new CognitoIdentityProviderClient({});

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const verifyEnabled = (process.env.VERIFY_SUBSCRIPTION || '').toLowerCase() === 'true';
  const subscriptionId = event.request.userAttributes?.['custom:stripeSubscriptionId'];

  let state: 'free' | 'pro' | 'pro_cancelling' = 'free';
  let periodEndIso: string = '';

  // 2) Verify subscription with Stripe at login if enabled, using stored subscription id
  if (verifyEnabled && stripeKey && subscriptionId) {
    try {
      const stripe = new Stripe(stripeKey);
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
        state = sub.cancel_at_period_end ? 'pro_cancelling' : 'pro';
        const cancelAt = (sub as any).cancel_at as number | undefined;
        const currentEnd = (sub as any).current_period_end as number | undefined;
        const trialEnd = (sub as any).trial_end as number | undefined;
        const maxEnd = Math.max(
          cancelAt ? Number(cancelAt) : 0,
          currentEnd ? Number(currentEnd) : 0,
          trialEnd ? Number(trialEnd) : 0,
        );
        if (maxEnd > 0) periodEndIso = new Date(maxEnd * 1000).toISOString();
      }
    } catch (err) {
      console.warn('Stripe subscription verification failed:', err);
    }
  }

  // 3) Reflect state in token claims and user attributes / groups
  try {
    // a) Do NOT override token groups to preserve non-plan groups (e.g., admin).
    //    Instead, add plan-related claims for immediate availability.
    event.response.claimsOverrideDetails = event.response.claimsOverrideDetails || {};
    event.response.claimsOverrideDetails.claimsToAddOrOverride = {
      ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
      plan: state, // added
      periodEnd: periodEndIso,
      'custom:periodEnd': periodEndIso,
    };

    // b) Update custom attributes for convenience
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [
          { Name: 'custom:periodEnd', Value: periodEndIso || '' },
        ],
      }),
    );

    // c) Sync actual Cognito Group membership (keeps things consistent)
    //    This may not reflect immediately in this token; the 'plan' claim above is immediate.
    try {
      if (state === 'pro') {
        await client.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO',
          }),
        );
        // ensure not in PRO_CANCELLING
        await client.send(
          new AdminRemoveUserFromGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO_CANCELLING',
          }),
        );
      } else if (state === 'pro_cancelling') {
        await client.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO_CANCELLING',
          }),
        );
        // ensure not in PRO
        await client.send(
          new AdminRemoveUserFromGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO',
          }),
        );
      } else {
        await client.send(
          new AdminRemoveUserFromGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO',
          }),
        );
        await client.send(
          new AdminRemoveUserFromGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: 'PRO_CANCELLING',
          }),
        );
      }
    } catch (groupErr) {
      // Non-fatal: plan claim already conveys plan state
      console.warn('Group sync warning:', groupErr);
    }
  } catch (err) {
    console.error('Error applying plan/group state:', err);
  }

  return event;
};
