import { defineAuth } from '@aws-amplify/backend';
import { preTokenGeneration } from './pre-token-generation/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
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
