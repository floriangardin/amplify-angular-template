import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/say-hello/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  sayHello,
  storage,
});

const domainPrefix = process.env.COGNITO_DOMAIN_PREFIX;
console.log("Using Cognito domain prefix:", domainPrefix);

if (domainPrefix)
backend.auth.resources.userPool.addDomain('cognito-domain', {
  cognitoDomain: { domainPrefix: domainPrefix },
});
