import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Pre-token generation trigger to set default user attributes.
 * Maps preferred_username from incoming OIDC attributes into tokens.
 * Sets plan to 'free' for all users.
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const client = new CognitoIdentityProviderClient({});

  try {
    event.response.claimsOverrideDetails = event.response.claimsOverrideDetails || {};
    const attrs = event.request.userAttributes || {} as any;
    const emailAttr = attrs['email'] as string | undefined;
    const preferredFromOidc =
      (attrs['preferred_username'] as string | undefined) ||
      (attrs['nickname'] as string | undefined) ||
      (attrs['custom:preferred_username'] as string | undefined) ||
      (emailAttr ? emailAttr.split('@')[0] : undefined);

    event.response.claimsOverrideDetails.claimsToAddOrOverride = {
      ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
      plan: 'free',
      debug_pre_token: '1',
      ...(preferredFromOidc ? { preferred_username: preferredFromOidc } : {}),
    };

    const userAttributesToUpdate: { Name: string; Value: string }[] = [];
    if (preferredFromOidc) {
      userAttributesToUpdate.push({ Name: 'preferred_username', Value: preferredFromOidc });
    }
    if (userAttributesToUpdate.length) {
      await client.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
          UserAttributes: userAttributesToUpdate,
        }),
      );
    }
  } catch (err) {
    console.error('Error in pre-token-generation trigger:', err);
  }

  return event;
};
