# White-Label Demo Refactoring Design

**Date:** 2026-02-26
**Branch:** `demo`
**Goal:** Transform the Arup-branded "Data or Disaster" app into a white-label demo called "Who is the best CDO?" — publicly accessible, no login, no subscriptions, playful design.

---

## 1. Color Palette Swap

Replace Arup red brand with a playful indigo/violet palette in `src/styles.css`:

| Role | Current | New |
|------|---------|-----|
| Primary | `#e61e28` (Red) | `#6366f1` (Indigo) |
| Secondary | `#7d4196` (Purple) | `#8b5cf6` (Violet) |
| Third | `#32a4a0` (Teal) | `#14b8a6` (Teal) |
| Fourth | `#4ba056` (Green) | `#22c55e` (Green) |
| Fifth | `#c83c96` (Magenta) | `#f43f5e` (Rose) |
| Header | `#005aaa` (Dark Blue) | `#1e1b4b` (Deep Indigo) |

## 2. Authentication Refactoring

### Remove
- `<amplify-authenticator>` wrapper in `app.component.html`
- Microsoft Entra ID OIDC config in `amplify/auth/resource.ts`
- Pre-token-generation Lambda (`amplify/auth/pre-token-generation/`)
- `signInWithCompany()` in `app.component.ts`
- Cognito groups (ADMIN, PRO, PRO_CANCELLING)
- Arup callback/logout URLs
- `amplify-config.ts` domain picker logic

### Add
- Cognito Identity Pool guest (unauthenticated) access
- `GuestAuthService` that:
  - Signs in via unauthenticated Cognito identity on first visit
  - Generates a random fun display name (e.g. "Bold Falcon #37")
  - Stores guest ID + name in localStorage
  - Exposes `currentUser` observable
- Minimal welcome splash with generated name + "Start Playing" button + option to edit name
- Update `amplify/data/resource.ts` auth rules for guest access (IAM / API key)

## 3. Stripe & Pro Features Removal

### Remove entirely
- `amplify/functions/` Stripe-related Lambda functions
- `StripeService` in services
- Plans/pricing page
- Pro plan checks and feature gating throughout components
- `PlanEnum`, custom plan attributes
- Cognito group-based auth (PRO, PRO_CANCELLING)
- `stripe` dependency from `package.json`
- Stripe env vars

### Result
- All scenarios unlocked for everyone
- No "Upgrade" prompts or "Pro" badges

## 4. Continue Learning Links

Replace Arup internal links in `learning-resources.component.ts`:

| Old | New |
|-----|-----|
| Arup Moodle course | [Data Governance (Wikipedia)](https://en.wikipedia.org/wiki/Data_governance) — "Learn the core principles of data governance" |
| Teams Lexi chatbot | [Data Quality (Wikipedia)](https://en.wikipedia.org/wiki/Data_quality) — "Understand what makes data trustworthy and reliable" |
| Arup SharePoint Data Literacy | [Chief Data Officer (Wikipedia)](https://en.wikipedia.org/wiki/Chief_data_officer) — "Discover what a CDO does and why it matters" |

## 5. Naming & Brand Cleanup

### Name changes
- "Data or Disaster" → "Who is the best CDO?"
- "Inbox Challenge" → "Demo"

### Assets
- Remove `arup_logo.png` and all `full_logo_transparent*.png` variants
- Replace with text-based "Who is the best CDO?" branding or generic logo
- Update `loading_logo.png` if Arup-branded

### Config cleanup
- Remove Arup domain references from callback URLs and Cognito config
- Simplify `amplify-config.ts`
- Update `index.html` title/meta
- Remove all "Arup" text references in templates

### Keep unchanged
- Game logic, scenario engine, scoring system
- Leaderboard mechanics (with guest users)
- UI component library
- Game assets (best_cdo.png, jail.png, audio files)
- Overall layout structure
