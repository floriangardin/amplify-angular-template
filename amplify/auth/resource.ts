import { defineAuth, secret } from '@aws-amplify/backend';
import { preTokenGeneration } from './pre-token-generation/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
loginWith: {
    email: true,
    externalProviders: {
      oidc: [
        {
          name: 'MicrosoftEntraID',
          clientId: secret('IDP_ID'),
          clientSecret: secret('IDP_SECRET'),
          issuerUrl: 'https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_56ULmUGvT',
        },
      ],
      // Important: Cognito requires exact matches, including trailing slash.
      // Include both with and without trailing slash for local and prod.
      logoutUrls: [
        'http://localhost:4200',
        'http://localhost:4200/',
        'https://app-qual.maketools.ai/',
        'https://app.maketools.ai/',
      ],
      callbackUrls: [
        'http://localhost:4200',
        'http://localhost:4200/',
        'https://app-qual.maketools.ai/',
        'https://app.maketools.ai/',
      ],
    },
  },
  groups: ['ADMIN', 'PRO', 'PRO_CANCELLING'],
  userAttributes: {
    'custom:planName': {
      mutable: true,
      dataType: 'String',
    },
    'custom:periodEnd': {
      mutable: true,
      dataType: 'String',
    },
    'custom:stripeCustomerId': {
      mutable: true,
      dataType: 'String',
    },
    'custom:stripeSubscriptionId': {
      mutable: true,
      dataType: 'String',
    },
  },
  triggers: {
    preTokenGeneration: preTokenGeneration,
  },
  access: (allow) => [
    allow.resource(preTokenGeneration).to([
      'updateUserAttributes',
      'getUser',
      'addUserToGroup',
      'removeUserFromGroup',
    ]),
  ],
});
