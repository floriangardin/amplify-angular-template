import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'images',
  access: (allow) => ({
    'previews/*': [
      // Also allow authenticated users to read previews (signed-in users won't use guest creds)
      allow.authenticated.to(['read']),
      // Admins can fully manage previews
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
  })
});