import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'images',
  access: (allow) => ({
    'previews/*': [
      // Also allow authenticated users to read previews (signed-in users won't use guest creds)
      allow.authenticated.to(['read']),
      // Ensure PRO and PRO_CANCELLING group roles can read as well (they assume group IAM roles)
      allow.groups(['PRO', 'PRO_CANCELLING']).to(['read']),
      // Admins can fully manage previews
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
    'content/*': [
      // Also allow authenticated users to read previews (signed-in users won't use guest creds)
      allow.authenticated.to(['read']),
      // Ensure PRO and PRO_CANCELLING group roles can read as well (they assume group IAM roles)
      allow.groups(['PRO', 'PRO_CANCELLING']).to(['read']),
      // Admins can fully manage previews
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
    'static_images/*': [
      // Also allow authenticated users to read previews (signed-in users won't use guest creds)
      allow.authenticated.to(['read']),
      // Ensure PRO and PRO_CANCELLING group roles can read as well (they assume group IAM roles)
      allow.groups(['PRO', 'PRO_CANCELLING']).to(['read']),
      // Admins can fully manage previews
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
  })
});