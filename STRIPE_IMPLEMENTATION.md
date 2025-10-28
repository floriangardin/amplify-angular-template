# Stripe Recurring Payment Feature - Implementation Summary

## 🔑 Required Configuration

### 1. Stripe Setup

You need to configure these on Stripe:

1. **Create a Product with Recurring Price**
   - Go to Stripe Dashboard → Products
   - Create product with monthly recurring price
   - Copy the Price ID (starts with `price_`)

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy Secret Key (starts with `sk_test_` or `sk_live_`)

3. **Create Webhook**
   - Go to Developers → Webhooks
   - Add endpoint (URL will be provided after deployment)
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy Webhook Secret (starts with `whsec_`)

### 2. Environment Variables

Set these in AWS Amplify Console (or `.env` for local):

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUCCESS_URL=https://yourdomain.com/settings?payment=success
CANCEL_URL=https://yourdomain.com/settings?payment=cancelled
VERIFY_SUBSCRIPTION=true
```

### 3. Post-Deployment Configuration

After deploying, you'll need to:

1. **Update Stripe Webhook URL**:
   - Get `webhookApiUrl` from deployment output
   - Update in Stripe Dashboard → Webhooks

2. **Update Frontend Config**:
   - Get `checkoutApiUrl` from deployment output
   - Add to `amplify_outputs.json`:
   ```json
   {
     "custom": {
       "checkoutApiUrl": "YOUR_CHECKOUT_API_URL"
     }
   }
   ```

### Verification Flow (at each login):

1. User logs in
2. Pre-token generation trigger fires
3. Trigger checks DynamoDB for subscription
4. Verifies subscription status with Stripe
5. If active: keeps user in PRO group
6. If inactive/cancelled: removes from PRO group, sets planName to 'free'

### Subscription Updates:

Stripe webhooks handle:
- **Subscription renewal**: Keeps user in PRO group
- **Payment failure**: User stays in PRO until Stripe retries fail
- **Subscription cancellation**: Removes from PRO group at the end of the period
- **Subscription reactivation**: Adds back to PRO group

## 🧪 Testing

### Test Mode (Use Test Keys):

1. **Test successful payment**:
   - Card: 4242 4242 4242 4242
   - Any future expiry, any CVC

2. **Test authentication required**:
   - Card: 4000 0025 0000 3155

3. **Test declined payment**:
   - Card: 4000 0000 0000 0002

