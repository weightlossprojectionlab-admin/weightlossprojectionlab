# Production Environment Setup Guide

**Version**: 1.0
**Target**: Production

## Required Environment Variables

### Security Configuration

```bash
# Super Admin Configuration (SEC-002)
SUPER_ADMIN_EMAILS="admin1@example.com,admin2@example.com"

# CORS Configuration (SEC-004)
ALLOWED_ORIGINS="https://app.weightlossprojectionlab.com,https://admin.weightlossprojectionlab.com"

# Rate Limiting (SEC-006)
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Node Environment
NODE_ENV="production"
```

### Firebase Configuration

```bash
# Firebase Admin SDK (Option A: Base64 - Recommended)
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64="[base64-encoded-json]"

# OR Option B: Individual Variables
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Storage Bucket
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"

# Client-Side (Public - Safe to Expose)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

### Third-Party Services

```bash
# Google Gemini AI
GEMINI_API_KEY="AIzaSy..."

# SendGrid Email
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@yourapp.com"
SENDGRID_FROM_NAME="Your App Name"

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Setup Instructions

### Netlify

```bash
# Via CLI
netlify env:set SUPER_ADMIN_EMAILS "admin1@example.com,admin2@example.com"
netlify env:set ALLOWED_ORIGINS "https://app.example.com"
netlify env:set UPSTASH_REDIS_REST_URL "https://your-redis.upstash.io"
netlify env:set UPSTASH_REDIS_REST_TOKEN "your-token"
netlify env:set NODE_ENV "production"

# Verify
netlify env:list
```

### Vercel

```bash
# Via CLI
vercel env add SUPER_ADMIN_EMAILS production
vercel env add ALLOWED_ORIGINS production
vercel env add NODE_ENV production

# Verify
vercel env ls
```

## Firebase Setup

### Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Verify deployment
firebase firestore:rules get
```

### Authentication Setup

1. Enable sign-in methods (Email/Password, Google)
2. Configure authorized domains
3. Run super admin migration:
   ```bash
   npx tsx scripts/migrate-super-admins.ts --apply
   ```

## Third-Party Services

### Upstash Redis

1. Create database at https://console.upstash.com/
2. Choose region closest to app servers
3. Copy REST API URL and token
4. Set environment variables

### Stripe

1. Get API keys from Dashboard > Developers > API Keys
2. Set up webhook: `https://yourapp.com/api/webhooks/stripe`
3. Copy webhook signing secret
4. Use test keys in development, live keys in production

### SendGrid

1. Create API key with Mail Send permissions
2. Verify sender identity (domain or email)
3. Test email sending:
   ```bash
   npx tsx scripts/test-sendgrid.ts
   ```

## Verification

Run pre-deploy validation:
```bash
bash scripts/pre-deploy-validation.sh
```

Expected output:
- ✅ All required environment variables set
- ✅ Firebase credentials valid
- ✅ Tests pass
- ✅ Build succeeds

## Troubleshooting

### Issue: "SUPER_ADMIN_EMAILS not set"
```bash
netlify env:set SUPER_ADMIN_EMAILS "admin@example.com"
```

### Issue: "Upstash Redis not configured"
- Verify both URL and TOKEN are set
- Check URL format: `https://[region].upstash.io`

### Issue: "Firebase Admin initialization failed"
- Verify base64 encoding is correct
- Check service account JSON is valid

### Issue: "CORS error"
- Ensure ALLOWED_ORIGINS includes protocol (https://)
- No trailing slashes
- Comma-separated, no spaces

## Security Checklist

- [ ] All required variables set
- [ ] Firebase credentials configured  
- [ ] Third-party API keys valid
- [ ] Security features enabled
- [ ] Validation script passes
- [ ] Never commit secrets to git
- [ ] Use different keys per environment
- [ ] Rotate keys if compromised

---

**Next**: Run pre-deploy validation
**Reference**: PRODUCTION_DEPLOYMENT_RUNBOOK.md
