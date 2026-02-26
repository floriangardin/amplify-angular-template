import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'images',
  access: (allow) => ({
    'previews/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'content/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'static_images/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  })
});
