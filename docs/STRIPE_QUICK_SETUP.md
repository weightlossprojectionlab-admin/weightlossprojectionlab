# Stripe Integration Quick Setup Guide

**Time to complete:** 30-60 minutes
**Goal:** Start collecting payments for your weight loss app

---

## ✅ What's Been Built (You're 80% Done!)

- ✅ Stripe checkout API route (`/api/stripe/create-checkout`)
- ✅ Stripe webhook handler (`/api/stripe/webhook`)
- ✅ Pricing page with 5 subscription tiers (`/pricing`)
- ✅ Trial expiration Cloud Function (runs daily)
- ✅ Auto-create trial subscriptions on signup
- ✅ Environment variables template updated

**You just need to configure Stripe and deploy!**

---

## 🚀 Step-by-Step Setup

### **Step 1: Create Stripe Account** (5 minutes)

1. Go to https://stripe.com and sign up
2. Complete business information (can start with test mode)
3. Get your API keys: https://dashboard.stripe.com/apikeys

Copy these to your `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### **Step 2: Create Products & Prices in Stripe** (15 minutes)

Go to https://dashboard.stripe.com/products and create **5 products**:

#### Product 1: Single User
- **Name:** Single User
- **Description:** Perfect for individual weight loss journeys
- **Pricing:**
  - Monthly: $9.99 → Copy Price ID
  - Yearly: $99.00 → Copy Price ID

#### Product 2: Single User Plus
- **Name:** Single User Plus
- **Description:** Medical tracking for comprehensive health
- **Pricing:**
  - Monthly: $14.99 → Copy Price ID
  - Yearly: $149.00 → Copy Price ID

#### Product 3: Family Basic
- **Name:** Family Basic
- **Description:** Track health for your whole family
- **Pricing:**
  - Monthly: $19.99 → Copy Price ID
  - Yearly: $199.00 → Copy Price ID

#### Product 4: Family Plus ⭐ POPULAR
- **Name:** Family Plus
- **Description:** Our most popular plan with advanced features
- **Pricing:**
  - Monthly: $29.99 → Copy Price ID
  - Yearly: $299.00 → Copy Price ID

#### Product 5: Family Premium
- **Name:** Family Premium
- **Description:** Unlimited everything for large families
- **Pricing:**
  - Monthly: $39.99 → Copy Price ID
  - Yearly: $399.00 → Copy Price ID

**Add all 10 Price IDs to `.env.local`:**
```bash
STRIPE_PRICE_SINGLE_MONTHLY=price_xxx
STRIPE_PRICE_SINGLE_YEARLY=price_xxx
STRIPE_PRICE_SINGLE_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_SINGLE_PLUS_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_BASIC_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_BASIC_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_PLUS_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_PREMIUM_YEARLY=price_xxx
```

---

### **Step 3: Set Up Webhooks** (10 minutes)

#### Development (Local Testing)

1. Install Stripe CLI:
   ```bash
   # Windows
   scoop install stripe

   # Mac
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

#### Production (After Deployment)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **URL:** `https://your-app.vercel.app/api/stripe/webhook`
4. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy signing secret and add to production environment variables

---

### **Step 4: Test the Flow** (10 minutes)

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Start Stripe webhook forwarding (separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Create a test account and sign up

4. Go to `/pricing` and click "Start Free Trial"

5. Use Stripe test card:
   - **Card:** 4242 4242 4242 4242
   - **Expiry:** Any future date
   - **CVC:** Any 3 digits
   - **ZIP:** Any 5 digits

6. Complete checkout → Should redirect to profile page

7. Check Firestore → User should have:
   ```javascript
   {
     subscription: {
       plan: 'single', // or whatever you selected
       status: 'active',
       stripeSubscriptionId: 'sub_...',
       stripeCustomerId: 'cus_...',
       // ... other fields
     }
   }
   ```

8. Check Stripe Dashboard → Should see:
   - New customer created
   - Active subscription
   - Successful payment

✅ **If all this works, you're ready for production!**

---

### **Step 5: Deploy to Production** (15 minutes)

#### Option A: Vercel (Recommended)

1. Push code to GitHub

2. Import project to Vercel:
   - Go to https://vercel.com/new
   - Select your repository
   - Click "Import"

3. Add environment variables in Vercel:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - **Important:** Use **live** Stripe keys for production:
     ```bash
     STRIPE_SECRET_KEY=sk_live_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
     ```

4. Deploy:
   ```bash
   vercel --prod
   ```

5. Set up production webhook (see Step 3)

#### Option B: Other Hosting

- **Netlify:** Similar to Vercel
- **Firebase Hosting:** Follow Firebase deployment guide
- **Your own server:** Ensure Node.js 18+ and environment variables are set

---

### **Step 6: Activate Trial Expiration** (5 minutes)

Deploy the Cloud Function:

```bash
firebase deploy --only functions:expireTrialSubscriptions,functions:manualExpireTrials
```

This will:
- Run automatically every day at midnight UTC
- Expire trials that have passed 30 days
- Update user subscription status to 'expired'

**Manual testing:**
```bash
# Call the manual trigger function
firebase functions:call manualExpireTrials
```

---

## 🎯 Post-Launch Checklist

After deploying to production:

- [ ] Test signup flow with test account
- [ ] Test payment with Stripe test card
- [ ] Verify webhook events are received
- [ ] Check Firestore subscription data updates
- [ ] Test trial expiration (manually trigger function)
- [ ] Monitor Stripe Dashboard for first real payment
- [ ] Set up email notifications for expired trials (TODO)
- [ ] Update Terms of Service with pricing
- [ ] Update Privacy Policy with payment processor info
- [ ] Add "Pricing" link to navigation menu

---

## 🔧 Troubleshooting

### "Stripe is not defined" error
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Restart dev server after adding env vars

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
- Check webhook URL is correct (`/api/stripe/webhook`)

### Subscription not updating in Firestore
- Check webhook is receiving events (Stripe Dashboard → Webhooks → Event history)
- Check Cloud Functions logs for errors
- Verify Firebase Admin SDK is initialized correctly

### Pricing page shows "Loading..." forever
- Check browser console for errors
- Verify `useAuth` and `useSubscription` hooks are working
- Check Firebase auth is initialized

---

## 📊 Monitoring & Analytics

### Stripe Dashboard
- **Payments:** https://dashboard.stripe.com/payments
- **Subscriptions:** https://dashboard.stripe.com/subscriptions
- **Customers:** https://dashboard.stripe.com/customers
- **Webhooks:** https://dashboard.stripe.com/webhooks

### Key Metrics to Track

1. **Trial-to-Paid Conversion Rate**
   - Goal: 10-20% (industry standard)
   - Formula: (Paid Subscriptions / Total Trials) × 100

2. **Monthly Recurring Revenue (MRR)**
   - Track in Stripe Dashboard → Revenue

3. **Churn Rate**
   - Track canceled subscriptions
   - Goal: <5% monthly

4. **Average Revenue Per User (ARPU)**
   - Total MRR / Total Active Subscribers

---

## 🆘 Support

**Stripe Documentation:**
- Checkout: https://stripe.com/docs/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

**Stripe Support:**
- Dashboard → Support
- Email: support@stripe.com

**Firebase Functions:**
- Docs: https://firebase.google.com/docs/functions
- Logs: `firebase functions:log`

---

## 🎉 You're Done!

Congratulations! Your app is now monetized.

**Next steps:**
1. Monitor first conversions
2. Collect user feedback on pricing
3. Optimize trial-to-paid conversion
4. Add email notifications for trial expiration
5. Build cancellation flow improvement

**Questions?** Check the full documentation in `MONETIZATION_ACTIVATION_ROADMAP.md`
