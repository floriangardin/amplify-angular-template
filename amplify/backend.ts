import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/say-hello/resource';
import { seedScenario } from './functions/seed-scenario/resource';
import { createCheckoutSession } from './functions/create-checkout-session/resource';
import { cancelSubscription } from './functions/cancel-subscription/resource';
import { reinstateSubscription } from './functions/reinstate-subscription/resource';
import { verifySubscription } from './functions/verify-subscription/resource';
import { listInvoices } from './functions/list-invoices/resource';
import { storage } from './storage/resource';
import * as iam from "aws-cdk-lib/aws-iam";

// Define all Amplify resources
const backend = defineBackend({
  auth,
  data,
  sayHello,
  seedScenario,
  createCheckoutSession,
  cancelSubscription,
  reinstateSubscription,
  verifySubscription,
  listInvoices,
  storage,
});


const domainPrefix = process.env.COGNITO_DOMAIN_PREFIX;


if (domainPrefix) {
  backend.auth.resources.userPool.addDomain('HostedCognitoDomain', {
    cognitoDomain: { domainPrefix },
  });
}