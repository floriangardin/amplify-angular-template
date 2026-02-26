# White-Label Demo Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Arup-branded "Data or Disaster" app into a white-label demo "Who is the best CDO?" — open access, no login, no subscriptions, playful indigo/violet design.

**Architecture:** Remove Amplify Authenticator + SSO, replace with guest access via Cognito Identity Pool (unauthenticated). Strip Stripe/pro gating entirely. Swap color palette, branding, and learning links. This is a standalone fork with its own infrastructure.

**Tech Stack:** Angular 20, AWS Amplify v2, Tailwind CSS v4.1, AppSync/DynamoDB

---

## Task 1: Color Palette Swap

**Files:**
- Modify: `src/styles.css:111-197` (theme block)

**Step 1: Replace color values in the @theme block**

In `src/styles.css`, replace the 6 base color values:

```css
/* OLD */
--color-primary-500: #e61e28;
--color-secondary-500: #7d4196;
--color-third-500: #32a4a0;
--color-fourth-500: #4ba056;
--color-fifth-500: #c83c96;
--color-header-500: #005aaa;

/* NEW */
--color-primary-500: #6366f1;
--color-secondary-500: #8b5cf6;
--color-third-500: #14b8a6;
--color-fourth-500: #22c55e;
--color-fifth-500: #f43f5e;
--color-header-500: #1e1b4b;
```

All shade variants (50-900) are auto-generated via `color-mix()` so they'll adapt automatically.

**Step 2: Verify the app builds**

Run: `npx ng build --configuration development 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style: swap Arup red palette to playful indigo/violet"
```

---

## Task 2: Rename App — "Who is the best CDO?" / "Demo"

**Files:**
- Modify: `src/index.html:14,17,19-20,26-27` — title and meta tags
- Modify: `src/app/components/header.component.ts:22-24` — header title
- Modify: `src/app/pages/home.component.ts:37` — loading text
- Modify: `src/app/pages/games/bestcdo/choice.component.ts:17` — game header
- Modify: `src/app/app.component.html:9` — login splash title (will be removed later, but fix now)

**Step 1: Update index.html**

Replace all occurrences of "Data or Disaster - Inbox Challenge" and "Data or Disaster":

```html
<!-- title -->
<title>Who is the best CDO? - Demo</title>

<!-- meta description -->
<meta name="description" content="Who is the best CDO? - Demo. An immersive simulation of data governance roles.">

<!-- Open Graph -->
<meta property="og:title" content="Who is the best CDO? - Demo">
<meta property="og:description" content="Who is the best CDO? - Demo. An immersive simulation of data governance roles.">

<!-- Twitter -->
<meta name="twitter:title" content="Who is the best CDO? - Demo">
<meta name="twitter:description" content="Who is the best CDO? - Demo. An immersive simulation of data governance roles.">
```

**Step 2: Update header.component.ts**

Replace the title text in template line ~24:

```html
<!-- OLD -->
Data or Disaster <span class="text-sm font-normal text-gray-500">Inbox Challenge</span>

<!-- NEW -->
Who is the best CDO? <span class="text-sm font-normal text-gray-500">Demo</span>
```

**Step 3: Update home.component.ts loading text**

```html
<!-- OLD -->
<app-main-loading [text]="'Loading Data or Disaster'"></app-main-loading>

<!-- NEW -->
<app-main-loading [text]="'Loading...'"></app-main-loading>
```

**Step 4: Update choice.component.ts game header**

```html
<!-- OLD -->
<span class="text-primary-600">Data or Disaster</span> <span class="text-lg font-normal text-gray-500">Inbox Challenge</span>

<!-- NEW -->
<span class="text-primary-600">Who is the best CDO?</span> <span class="text-lg font-normal text-gray-500">Demo</span>
```

**Step 5: Update app.component.html login splash**

```html
<!-- OLD -->
<h1 class="text-3xl font-extrabold text-white z-10 text-center">Data or Disaster?</h1>

<!-- NEW -->
<h1 class="text-3xl font-extrabold text-white z-10 text-center">Who is the best CDO?</h1>
```

**Step 6: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 7: Commit**

```bash
git add src/index.html src/app/components/header.component.ts src/app/pages/home.component.ts src/app/pages/games/bestcdo/choice.component.ts src/app/app.component.html
git commit -m "feat: rename app to 'Who is the best CDO? - Demo'"
```

---

## Task 3: Remove Arup Branding from Templates

**Files:**
- Modify: `src/app/components/header.component.ts:18` — remove Arup logo, replace with text brand
- Modify: `src/app/app.component.html:12-13` — remove "By" + Arup logo from login splash

**Step 1: Update header.component.ts — replace Arup logo with text**

Replace the logo `<img>` line:

```html
<!-- OLD -->
<img src="arup_logo.png" alt="Arup Logo" class="h-8 cursor-pointer" title="Home" (click)="goHome()"/>

<!-- NEW (text-based brand) -->
<span class="text-lg font-bold text-primary-500 cursor-pointer" title="Home" (click)="goHome()">Best CDO</span>
```

**Step 2: Update app.component.html — remove Arup references**

Remove the "By" + Arup logo lines:

```html
<!-- OLD -->
<span>By</span>
<img src="arup_logo.png" alt="Company Logo" class="w-48 h-auto mb-4">

<!-- NEW: remove both lines entirely -->
```

**Step 3: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/app/components/header.component.ts src/app/app.component.html
git commit -m "feat: remove Arup logo, replace with text branding"
```

---

## Task 4: Update Learning Resources Links

**Files:**
- Modify: `src/app/components/learning-resources.component.ts:10-30` — swap all 3 links

**Step 1: Replace template content**

Replace the 3 `<a>` blocks in the template:

```html
<a href="https://en.wikipedia.org/wiki/Data_governance"
   target="_blank"
   rel="noopener noreferrer"
   [ngClass]="linkClass()">
  <span class="text-lg">📚</span>
  <span class="underline">Learn the core principles of data governance</span>
</a>
<a href="https://en.wikipedia.org/wiki/Data_quality"
   target="_blank"
   rel="noopener noreferrer"
   [ngClass]="linkClass()">
  <span class="text-lg">🔐</span>
  <span class="underline">Understand what makes data trustworthy and reliable</span>
</a>
<a href="https://en.wikipedia.org/wiki/Chief_data_officer"
   target="_blank"
   rel="noopener noreferrer"
   [ngClass]="linkClass()">
  <span class="text-lg">🏛️</span>
  <span class="underline">Discover what a CDO does and why it matters</span>
</a>
```

**Step 2: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/components/learning-resources.component.ts
git commit -m "feat: replace Arup internal links with Wikipedia data governance resources"
```

---

## Task 5: Remove Stripe Lambda Functions & Backend References

**Files:**
- Delete: `amplify/functions/create-checkout-session/` (entire directory)
- Delete: `amplify/functions/cancel-subscription/` (entire directory)
- Delete: `amplify/functions/reinstate-subscription/` (entire directory)
- Delete: `amplify/functions/verify-subscription/` (entire directory)
- Delete: `amplify/functions/list-invoices/` (entire directory)
- Modify: `amplify/backend.ts` — remove Stripe function imports and references
- Modify: `amplify/data/resource.ts` — remove Stripe queries/mutations and InvoiceSummary type

**Step 1: Delete Stripe function directories**

```bash
rm -rf amplify/functions/create-checkout-session
rm -rf amplify/functions/cancel-subscription
rm -rf amplify/functions/reinstate-subscription
rm -rf amplify/functions/verify-subscription
rm -rf amplify/functions/list-invoices
```

**Step 2: Simplify amplify/backend.ts**

Remove the 5 Stripe function imports and their references in `defineBackend`:

```typescript
// NEW amplify/backend.ts
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

// Allow guest access (no self-signup restriction for demo)
```

Note: Remove the `allowAdminCreateUserOnly` block — this demo doesn't need it since we're using guest access.

**Step 3: Remove Stripe queries/mutations from amplify/data/resource.ts**

Remove these blocks from the schema:
- `InvoiceSummary` custom type (lines 17-26)
- `createCheckoutSession` query (lines 28-33)
- `cancelSubscription` mutation (lines 35-40)
- `reinstateSubscription` mutation (lines 42-47)
- `verifySubscription` mutation (lines 49-56)
- `listInvoices` query (lines 58-63)

Also remove their imports at the top of the file (lines 4-8):
```typescript
// DELETE these imports
import { createCheckoutSession } from '../functions/create-checkout-session/resource';
import { cancelSubscription } from '../functions/cancel-subscription/resource';
import { reinstateSubscription } from '../functions/reinstate-subscription/resource';
import { verifySubscription } from '../functions/verify-subscription/resource';
import { listInvoices } from '../functions/list-invoices/resource';
```

**Step 4: Remove PlanEnum from schema**

Remove line: `PlanEnum: a.enum(['free','pro']),`

Update `Card` custom type to remove plan reference:
```typescript
Card: a.customType({
  // plan field removed — all content is free in demo
  title: a.string().required(),
  shortDescription: a.string().required(),
  difficulty: a.string().required(),
  skillsAcquired: a.string().array().required(),
  context: a.ref('CardContext').required(),
  metadata: a.ref('CardMetadata').required(),
}),
```

**Step 5: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 6: Commit**

```bash
git add -A amplify/functions amplify/backend.ts amplify/data/resource.ts
git commit -m "feat: remove Stripe functions, plan gating, and subscription queries from backend"
```

---

## Task 6: Remove Stripe & Pro References from Frontend Services

**Files:**
- Delete: `src/app/services/stripe.service.ts`
- Modify: `src/app/services/user.service.ts` — remove plan/pro/admin signals and token parsing
- Modify: `src/app/models/user.ts` — remove PlanName type

**Step 1: Delete StripeService**

```bash
rm src/app/services/stripe.service.ts
```

**Step 2: Simplify UserService**

Replace the entire file. The new UserService generates a guest identity:

```typescript
import { Injectable, signal } from '@angular/core';

const ADJECTIVES = ['Bold','Clever','Swift','Bright','Calm','Daring','Eager','Fierce','Gentle','Happy','Keen','Lucky','Noble','Quick','Sharp','Brave','Witty','Zesty','Cool','Wise'];
const ANIMALS = ['Falcon','Panda','Tiger','Eagle','Wolf','Dolphin','Fox','Owl','Hawk','Bear','Lion','Raven','Lynx','Orca','Crane','Heron','Koala','Otter','Stag','Viper'];

function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${animal} #${num}`;
}

function generateGuestId(): string {
  return 'guest-' + crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class UserService {
  isAdmin = signal<boolean>(false);
  isPro = signal<boolean>(true); // everything unlocked in demo
  email = signal<string>('');
  preferredUsername = signal<string>('');
  planName = signal<string>('pro');
  periodEnd = signal<string | null>(null);
  currentUserId = signal<string>('');

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    let guestId = localStorage.getItem('demo_guest_id');
    let guestName = localStorage.getItem('demo_guest_name');
    if (!guestId) {
      guestId = generateGuestId();
      localStorage.setItem('demo_guest_id', guestId);
    }
    if (!guestName) {
      guestName = generateGuestName();
      localStorage.setItem('demo_guest_name', guestName);
    }
    this.currentUserId.set(guestId);
    this.preferredUsername.set(guestName);
    this.email.set(`${guestName.toLowerCase().replace(/\s+/g, '.')}@demo`);
  }

  async refreshNow(_showWarnings: boolean = true): Promise<void> {
    // No-op in demo mode — identity is localStorage-based
  }

  /** Allow the user to update their display name */
  setDisplayName(name: string): void {
    localStorage.setItem('demo_guest_name', name);
    this.preferredUsername.set(name);
  }
}
```

**Step 3: Simplify user.ts model**

```typescript
export type PlanName = 'free' | 'pro' | '' | 'pro_cancelling';

export interface User {
  id: string;
  sub: string;
}
```

Keep `PlanName` for now to avoid breaking imports everywhere — it's harmless.

**Step 4: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 5: Commit**

```bash
git add src/app/services/stripe.service.ts src/app/services/user.service.ts src/app/models/user.ts
git commit -m "feat: replace auth/stripe services with guest identity system"
```

---

## Task 7: Remove Pro Gating from Frontend Components

**Files:**
- Modify: `src/app/pages/home.component.ts` — remove Stripe imports, checkout logic, isPro refs
- Modify: `src/app/components/header.component.ts` — remove StripeService, sign out, plan refs
- Modify: `src/app/ui/elements/scenario-card.component.ts:243-249` — make `locked` always false for non-disabled
- Delete: `src/app/pages/plans.component.ts` — entire plans page
- Modify: `src/app/app.routes.ts` — remove plans route
- Modify: `src/app/pages/settings.component.ts` — strip Stripe/plan/invoice logic or delete entirely

**Step 1: Update home.component.ts**

Remove these imports:
```typescript
// DELETE
import {StripeService} from '../services/stripe.service'
```

Remove `stripeService` injection and `goPro()` method. Remove the Stripe checkout detection block in `ngOnInit()` (lines 233-250). Remove `onUpgrade()` method.

Remove `isPro` and `planName` computed properties if only used for plan gating.

**Step 2: Update header.component.ts**

Remove `StripeService` import and injection. Remove `goPro()` method. Replace `onSignOut()` with a guest "reset" or simply remove it (replace sign out button with display name only). Remove `planName` computed.

**Step 3: Update scenario-card.component.ts locked logic**

Change the `locked` computed to never lock based on plan:

```typescript
locked = computed(() => {
  const explicit = this.disabled();
  if (explicit !== null) return !!explicit;
  return false; // All scenarios unlocked in demo
});
```

Remove the `isPro` input if unused after this change.

**Step 4: Delete plans.component.ts and remove route**

```bash
rm src/app/pages/plans.component.ts
```

In `src/app/app.routes.ts`, remove the plans route and its import:
```typescript
// DELETE
import { PlansComponent } from './pages/plans.component';
// DELETE
{ path: 'plans', component: PlansComponent },
```

**Step 5: Simplify or delete settings.component.ts**

Strip all Stripe/plan/invoice logic. The settings page can either be deleted (remove route) or simplified to just show the guest name with edit capability.

**Step 6: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 7: Commit**

```bash
git add -A src/app/pages src/app/components src/app/ui src/app/app.routes.ts
git commit -m "feat: remove all pro gating, plans page, and Stripe references from frontend"
```

---

## Task 8: Simplify Auth Backend — Remove SSO, Enable Guest Access

**Files:**
- Modify: `amplify/auth/resource.ts` — remove OIDC provider, groups, custom attributes, pre-token trigger
- Delete: `amplify/auth/pre-token-generation/` (entire directory)
- Modify: `amplify/data/resource.ts` — update authorization rules for guest/public access
- Modify: `src/amplify-config.ts` — simplify domain picker

**Step 1: Simplify amplify/auth/resource.ts**

Replace with minimal auth config that supports guest access:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  // No groups, no external providers, no triggers for demo
});
```

**Step 2: Delete pre-token-generation Lambda**

```bash
rm -rf amplify/auth/pre-token-generation
```

**Step 3: Update data authorization rules in amplify/data/resource.ts**

Change the default authorization and model-level rules to allow guest/public access:

For `UserScenarioProgress`:
```typescript
.authorization(allow => [
  allow.publicApiKey().to(['read', 'create', 'update']),
  allow.authenticated().to(['read', 'create', 'update', 'delete']),
])
```

For `LeaderboardEntry`:
```typescript
.authorization(allow => [
  allow.publicApiKey().to(['read', 'create', 'update']),
  allow.authenticated().to(['read', 'create', 'update', 'delete']),
])
```

For the global schema authorization at the bottom:
```typescript
.authorization((allow) => [
  allow.publicApiKey().to(['read']),
  allow.authenticated().to(['read']),
]);
```

Also update `authorizationModes` in `defineData`:
```typescript
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
```

**Step 4: Simplify amplify-config.ts**

```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
```

**Step 5: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 6: Commit**

```bash
git add -A amplify/auth amplify/data/resource.ts src/amplify-config.ts
git commit -m "feat: simplify auth to guest access, remove SSO and pre-token Lambda"
```

---

## Task 9: Remove Amplify Authenticator from App Component

**Files:**
- Modify: `src/app/app.component.html` — remove authenticator wrapper, show router directly
- Modify: `src/app/app.component.ts` — remove authenticator imports and signInWithCompany
- Modify: `src/app/app.config.ts` — check if AmplifyAuthenticatorModule needs removal from providers

**Step 1: Replace app.component.html**

```html
<div class="min-h-screen min-w-screen arial">
  <router-outlet></router-outlet>
</div>
```

**Step 2: Simplify app.component.ts**

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet],
})
export class AppComponent {
  title = 'amplify-angular-template';
}
```

**Step 3: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/app/app.component.html src/app/app.component.ts
git commit -m "feat: remove Amplify Authenticator, app loads directly to router"
```

---

## Task 10: Update Data Services for Guest Access

**Files:**
- Modify: `src/app/services/progress.service.ts` — use localStorage guest ID instead of Cognito tokens
- Modify: `src/app/services/leaderboard.service.ts` — use localStorage guest ID instead of Cognito tokens
- Modify: `src/app/services/client.service.ts` — ensure client uses apiKey auth mode

**Step 1: Update ProgressService.getIdentity()**

Replace the `getIdentity()` method to use localStorage:

```typescript
async getIdentity(): Promise<{ userId: string; username: string }> {
  const userId = localStorage.getItem('demo_guest_id') || '';
  const username = localStorage.getItem('demo_guest_name') || 'Anonymous';
  return { userId, username };
}
```

Remove the `fetchAuthSession` import.

**Step 2: Update LeaderboardService.getIdentity()**

Same change as ProgressService — use localStorage:

```typescript
async getIdentity(): Promise<{ userId: string; username: string }> {
  const userId = localStorage.getItem('demo_guest_id') || '';
  const username = localStorage.getItem('demo_guest_name') || 'Anonymous';
  return { userId, username };
}
```

Remove the `fetchAuthSession` import.

**Step 3: Update ClientService to use API key auth**

```typescript
import '../../amplify-config';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClientService {
    public client = generateClient<Schema>({ authMode: 'apiKey' });

    constructor() {}
}
```

**Step 4: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 5: Commit**

```bash
git add src/app/services/progress.service.ts src/app/services/leaderboard.service.ts src/app/services/client.service.ts
git commit -m "feat: update data services to use guest identity and API key auth"
```

---

## Task 11: Remove stripe dependency from package.json

**Files:**
- Modify: `package.json` — remove `stripe` dependency

**Step 1: Remove stripe**

```bash
npm uninstall stripe
```

Also remove `@aws-sdk/client-cognito-identity-provider` if no longer needed (it was only used in the pre-token Lambda which is now deleted):

```bash
npm uninstall @aws-sdk/client-cognito-identity-provider @aws-sdk/client-route-53
```

**Step 2: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove stripe and unused AWS SDK dependencies"
```

---

## Task 12: Header Cleanup — Remove Sign Out, Add Name Edit

**Files:**
- Modify: `src/app/components/header.component.ts` — replace sign-out menu with guest name display + edit option

**Step 1: Update header template and class**

Replace the user menu dropdown with a simpler display. Remove `signOut` import from `aws-amplify/auth`. Replace the "Sign out" menu item with a "Change name" option that uses a simple prompt:

In the template, replace the sign-out button:
```html
<button
  type="button"
  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
  role="menuitem"
  (click)="onChangeName(); closeMenu()"
>
  <i class="fa-solid fa-pen"></i>
  Change name
</button>
```

Add method to component class:
```typescript
onChangeName() {
  const current = this.displayName();
  const newName = window.prompt('Enter your display name:', current);
  if (newName?.trim()) {
    this.userService.setDisplayName(newName.trim());
  }
}
```

Remove `onSignOut()`, `signOut` import, and `StripeService` import/injection.

**Step 2: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/components/header.component.ts
git commit -m "feat: replace sign-out with guest name display and edit"
```

---

## Task 13: Clean Up Settings Page

**Files:**
- Modify: `src/app/pages/settings.component.ts` — strip all Stripe/plan logic, simplify to name edit
- OR delete the settings page entirely and remove its route

**Step 1: Simplify settings or remove**

Option A (simplify): Keep the page but only show guest name with edit capability.
Option B (delete): Remove `src/app/pages/settings.component.ts` and remove the route from `app.routes.ts`.

Recommended: Option B — delete it. The header menu already provides name editing.

```bash
rm src/app/pages/settings.component.ts
```

Remove from `app.routes.ts`:
```typescript
// DELETE
import { SettingsComponent } from './pages/settings.component';
// DELETE
{ path: 'settings', component: SettingsComponent },
```

**Step 2: Verify build**

Run: `npx ng build --configuration development 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/pages/settings.component.ts src/app/app.routes.ts
git commit -m "feat: remove settings page (no longer needed for demo)"
```

---

## Task 14: Final Build Verification & Cleanup

**Step 1: Full build**

Run: `npx ng build 2>&1 | tail -20`
Expected: Build succeeds with no errors

**Step 2: Search for any remaining Arup references**

```bash
grep -ri "arup" src/ --include="*.ts" --include="*.html" --include="*.css" -l
```

Fix any remaining references found.

**Step 3: Search for remaining Stripe references**

```bash
grep -ri "stripe" src/ --include="*.ts" --include="*.html" -l
```

Fix any remaining references found.

**Step 4: Search for remaining "Data or Disaster" references**

```bash
grep -ri "data or disaster" src/ --include="*.ts" --include="*.html" --include="*.css" -l
```

Fix any remaining references found.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove remaining Arup/Stripe/old name references"
```

---

## Summary of Deleted Files

- `amplify/functions/create-checkout-session/` (directory)
- `amplify/functions/cancel-subscription/` (directory)
- `amplify/functions/reinstate-subscription/` (directory)
- `amplify/functions/verify-subscription/` (directory)
- `amplify/functions/list-invoices/` (directory)
- `amplify/auth/pre-token-generation/` (directory)
- `src/app/services/stripe.service.ts`
- `src/app/pages/plans.component.ts`
- `src/app/pages/settings.component.ts`

## Key Modified Files

- `src/styles.css` — new color palette
- `src/index.html` — new title/meta
- `src/app/app.component.ts` + `.html` — no authenticator
- `src/app/components/header.component.ts` — new branding + guest menu
- `src/app/components/learning-resources.component.ts` — Wikipedia links
- `src/app/services/user.service.ts` — guest identity system
- `src/app/services/progress.service.ts` — guest-based identity
- `src/app/services/leaderboard.service.ts` — guest-based identity
- `src/app/services/client.service.ts` — API key auth mode
- `src/app/ui/elements/scenario-card.component.ts` — no pro locking
- `src/app/pages/home.component.ts` — no Stripe logic
- `src/app/app.routes.ts` — removed plans/settings routes
- `amplify/auth/resource.ts` — minimal auth, no SSO
- `amplify/backend.ts` — no Stripe functions
- `amplify/data/resource.ts` — public API key access, no plan enum
- `src/amplify-config.ts` — simplified
- `package.json` — removed stripe dependency
