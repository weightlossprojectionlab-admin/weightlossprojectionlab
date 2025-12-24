# Production Deployment Automation

Complete guide for automated production deployment of the Weight Loss Project Lab application.

## Table of Contents

1. [Overview](#overview)
2. [Deployment Scripts](#deployment-scripts)
3. [CI/CD Workflow](#cicd-workflow)
4. [Manual Deployment](#manual-deployment)
5. [Monitoring](#monitoring)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The deployment automation system provides:

- **Automated deployment pipeline** with GitHub Actions
- **Pre-deployment validation** to catch issues early
- **Post-deployment validation** to verify successful deployment
- **Real-time monitoring** dashboard
- **One-command rollback** for emergency situations
- **Dry-run mode** for testing deployment without making changes

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Pre-Deployment Validation                               │
│     └─ Environment checks, tests, security audit           │
│                                                             │
│  2. Backup Creation                                         │
│     └─ Commit hash, Firebase data                          │
│                                                             │
│  3. Build Application                                       │
│     └─ npm install, npm build                              │
│                                                             │
│  4. Run Tests                                               │
│     └─ Unit tests, integration tests                       │
│                                                             │
│  5. Deploy Firebase Rules                                   │
│     └─ Firestore rules, Storage rules                      │
│                                                             │
│  6. Run Migrations                                          │
│     └─ Database migrations, data fixes                     │
│                                                             │
│  7. Deploy Application                                      │
│     └─ Netlify/Vercel deployment                           │
│                                                             │
│  8. Post-Deployment Validation                              │
│     └─ Health checks, smoke tests                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Scripts

### 1. Main Deployment Script

**Location**: `scripts/deploy-production.sh`

**Usage**:
```bash
# Full deployment
bash scripts/deploy-production.sh production false

# Dry run (test without deploying)
bash scripts/deploy-production.sh production true
```

**Parameters**:
- `environment`: Target environment (default: `production`)
- `dry_run`: Test mode (default: `false`)

**What it does**:
1. Runs pre-deployment validation
2. Creates backups
3. Builds application
4. Runs tests
5. Deploys Firebase rules
6. Runs migrations
7. Deploys application
8. Validates deployment

---

### 2. Pre-Deployment Validation

**Location**: `scripts/pre-deploy-validation.sh`

**Usage**:
```bash
bash scripts/pre-deploy-validation.sh
```

**Checks**:
- ✅ Node.js version compatibility
- ✅ Git working directory status
- ✅ Environment configuration files
- ✅ Firebase configuration
- ✅ TypeScript type checking
- ✅ ESLint validation
- ✅ Security vulnerabilities
- ✅ Disk space availability

**Exit codes**:
- `0`: All checks passed
- `1`: One or more checks failed

---

### 3. Post-Deployment Validation

**Location**: `scripts/post-deploy-validation.sh`

**Usage**:
```bash
bash scripts/post-deploy-validation.sh https://your-production-url.com
```

**Checks**:
- ✅ Homepage accessibility (HTTP 200)
- ✅ Login page accessibility
- ✅ API health endpoint
- ✅ Security headers present
- ✅ SSL certificate validity
- ✅ Response time performance
- ✅ Static assets loading

---

### 4. Health Check Script

**Location**: `scripts/deployment-health-check.sh`

**Usage**:
```bash
# Check production
bash scripts/deployment-health-check.sh https://your-app.com

# Check localhost
bash scripts/deployment-health-check.sh http://localhost:3000
```

**Performs**:
- Basic health checks
- Security verification
- Performance checks
- SSL validation

---

### 5. Monitoring Dashboard

**Location**: `scripts/monitor-deployment.sh`

**Usage**:
```bash
# Monitor with 30-second interval
bash scripts/monitor-deployment.sh https://your-app.com 30

# Monitor with 60-second interval
bash scripts/monitor-deployment.sh https://your-app.com 60
```

**Features**:
- Real-time status monitoring
- Response time tracking
- Security header verification
- Performance metrics
- Continuous updates every N seconds

**Dashboard Display**:
```
📊 Deployment Monitoring Dashboard - 2025-12-01 14:30:00
==============================================================

Target: https://your-app.com
Iteration: 42

=== Homepage ===
✅ Status: 200
   Response Time: 0.456s

=== Login Page ===
✅ Status: 200
   Response Time: 0.523s

=== API Health ===
✅ Status: 200
   Response Time: 0.234s

=== Security ===
✅ Security Headers: 3/3 present

=== Performance Summary ===
Average Response Time: 0.404s
Performance: ✅ Excellent
```

---

### 6. Rollback Script

**Location**: `scripts/rollback-deployment.sh`

**Usage**:
```bash
# See recent commits and choose one
bash scripts/rollback-deployment.sh

# Rollback to specific commit
bash scripts/rollback-deployment.sh abc1234
```

**Safety Features**:
- Shows commit details before rollback
- Requires explicit confirmation ("ROLLBACK")
- Creates emergency backup of current state
- Validates deployment after rollback
- Provides instructions to return to main

---

## CI/CD Workflow

### GitHub Actions Workflow

**Location**: `.github/workflows/deploy-production.yml`

### Trigger Options

#### 1. Automatic Deployment
Automatically deploys when:
- Code is pushed to `main` branch
- Excludes documentation changes (`*.md`, `docs/**`)

#### 2. Manual Deployment
Trigger manually from GitHub Actions tab:
1. Go to **Actions** tab
2. Select **Production Deployment**
3. Click **Run workflow**
4. Choose options:
   - **dry_run**: Test without deploying
   - **skip_tests**: Skip test execution

### Workflow Jobs

#### Job 1: Pre-Deployment Checks
- Install dependencies
- Run linter
- Type check with TypeScript
- Run tests
- Security audit
- Build application

#### Job 2: Security Scan
- Run critical security audit
- Check for vulnerabilities

#### Job 3: Deploy Firebase Rules
- Deploy Firestore rules
- Deploy Storage rules

#### Job 4: Run Migrations
- Check for migration scripts
- Run patient data migrations
- Run other data migrations

#### Job 5: Deploy Application
- Build application
- Deploy to Netlify/Vercel

#### Job 6: Post-Deployment Validation
- Wait for propagation (60s)
- Check homepage
- Check login page
- Verify security headers
- Validate SSL certificate
- Run E2E tests (optional)

#### Job 7: Notify Deployment
- Send success/failure notification
- Create deployment summary

### Required Secrets

Configure these in GitHub repository settings:

```
FIREBASE_TOKEN          # Firebase CLI token
FIREBASE_SERVICE_ACCOUNT # Firebase service account JSON
NETLIFY_AUTH_TOKEN      # Netlify authentication token
NETLIFY_SITE_ID         # Netlify site ID
PRODUCTION_URL          # Production URL for validation
```

### How to Set Up Secrets

1. Go to repository **Settings**
2. Navigate to **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each required secret

---

## Manual Deployment

### Prerequisites

1. **Install required tools**:
```bash
npm install -g firebase-tools
npm install -g netlify-cli
```

2. **Authenticate**:
```bash
firebase login
netlify login
```

3. **Verify environment**:
```bash
# Check Node version
node -v  # Should be v18, v20, or v22

# Check Git status
git status
```

### Step-by-Step Manual Deployment

#### Step 1: Pre-Deployment Validation
```bash
bash scripts/pre-deploy-validation.sh
```

If validation fails, fix issues before proceeding.

#### Step 2: Create Backups
```bash
# Create backups directory
mkdir -p backups

# Save current commit
git rev-parse HEAD > backups/pre-deploy-commit-$(date +%Y%m%d_%H%M%S).txt

# Backup Firebase (manual in Console):
# 1. Go to Firebase Console
# 2. Firestore > Backups > Create backup
# 3. Storage > Create backup
```

#### Step 3: Build Application
```bash
npm install
npm run build
```

#### Step 4: Run Tests
```bash
npm test
```

#### Step 5: Deploy Firebase Rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

#### Step 6: Run Migrations (if needed)
```bash
# Run patient data migration
npx tsx scripts/fix-patient-data.ts

# Run other migrations as needed
```

#### Step 7: Deploy Application
```bash
# For Netlify
netlify deploy --prod

# For Vercel
vercel --prod
```

#### Step 8: Post-Deployment Validation
```bash
bash scripts/post-deploy-validation.sh https://your-production-url.com
```

---

## Monitoring

### Real-Time Monitoring

Start the monitoring dashboard:
```bash
bash scripts/monitor-deployment.sh https://your-app.com 30
```

### What to Monitor

#### Application Logs
- Firebase Console: Functions logs
- Netlify Dashboard: Deploy logs
- Browser Console: Client-side errors

#### Performance Metrics
- Response times
- Error rates
- User sessions
- API latency

#### Security Events
- Failed authentication attempts
- Firestore security rule violations
- Rate limit violations

### Firebase Console Monitoring

1. Go to **Firebase Console**
2. Navigate to **Analytics**
3. Monitor:
   - Active users
   - Error rates
   - Custom events

### Setting Up Alerts

#### Firebase Performance Monitoring
```javascript
// Add to your app
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

#### Custom Monitoring Script
Create `scripts/check-production-health.sh`:
```bash
#!/bin/bash
# Run this with cron every 5 minutes
bash scripts/deployment-health-check.sh https://your-app.com

if [ $? -ne 0 ]; then
  # Send alert (email, Slack, etc.)
  echo "ALERT: Production health check failed!"
fi
```

---

## Rollback Procedures

### Emergency Rollback

If issues are detected in production:

#### 1. Quick Rollback (Automated)
```bash
# Find the last good commit
bash scripts/rollback-deployment.sh

# Or directly specify commit
bash scripts/rollback-deployment.sh abc1234
```

#### 2. Manual Rollback Steps

**Option A: Revert to Previous Commit**
```bash
# Find previous commit
git log --oneline -10

# Checkout previous commit
git checkout <previous-commit>

# Rebuild and deploy
npm install
npm run build
netlify deploy --prod
```

**Option B: Use Netlify Rollback**
```bash
# List recent deploys
netlify deploys:list

# Rollback to previous deploy
netlify rollback
```

**Option C: Use Git Revert**
```bash
# Revert problematic commit
git revert <bad-commit>

# Push to trigger auto-deployment
git push origin main
```

### Post-Rollback Checklist

- [ ] Verify application is working
- [ ] Check critical user flows
- [ ] Monitor error rates
- [ ] Document rollback reason
- [ ] Create issue for root cause
- [ ] Plan fix and redeployment

---

## Troubleshooting

### Common Issues

#### Issue 1: Build Fails

**Symptoms**: `npm run build` fails

**Solutions**:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Check for environment variables
cat .env.production
```

#### Issue 2: Firebase Rules Deployment Fails

**Symptoms**: `firebase deploy --only firestore:rules` fails

**Solutions**:
```bash
# Re-authenticate
firebase logout
firebase login

# Check rules syntax
firebase firestore:rules:validate firestore.rules

# Deploy with debug
firebase deploy --only firestore:rules --debug
```

#### Issue 3: Post-Deployment Validation Fails

**Symptoms**: Health checks return errors

**Solutions**:
```bash
# Check if deployment is complete
curl -I https://your-app.com

# Check DNS propagation
nslookup your-app.com

# Wait longer for CDN propagation
sleep 120
bash scripts/deployment-health-check.sh https://your-app.com

# Check Netlify logs
netlify logs --prod
```

#### Issue 4: Application Not Loading

**Symptoms**: 404 or blank page

**Solutions**:
1. Check build output exists:
   ```bash
   ls -la .next/
   ```

2. Check environment variables:
   ```bash
   # Verify in Netlify dashboard
   netlify env:list
   ```

3. Check for client-side errors:
   - Open browser console (F12)
   - Look for JavaScript errors

4. Rebuild and redeploy:
   ```bash
   npm run build
   netlify deploy --prod
   ```

#### Issue 5: Slow Performance

**Symptoms**: High response times

**Solutions**:
1. Check CDN cache:
   ```bash
   curl -I https://your-app.com | grep cache
   ```

2. Analyze bundle size:
   ```bash
   npm run bundle:size
   ```

3. Check database query performance in Firebase Console

4. Enable caching headers in `next.config.ts`

### Debug Mode

Enable debug logging:

```bash
# For deployment script
DEBUG=true bash scripts/deploy-production.sh production false

# For Firebase
firebase deploy --debug

# For Netlify
netlify deploy --debug
```

---

## Best Practices

### Before Deployment

1. ✅ Test locally with production build
2. ✅ Run all tests
3. ✅ Review changes in staging environment
4. ✅ Create backups
5. ✅ Notify team of deployment
6. ✅ Schedule during low-traffic period

### During Deployment

1. ✅ Monitor deployment logs
2. ✅ Watch for errors
3. ✅ Don't interrupt deployment process
4. ✅ Keep rollback plan ready

### After Deployment

1. ✅ Run post-deployment validation
2. ✅ Monitor for 30 minutes
3. ✅ Check error reporting
4. ✅ Test critical user flows
5. ✅ Verify Firebase rules
6. ✅ Document any issues

### Deployment Schedule

**Recommended times**:
- Monday-Thursday: 10 AM - 2 PM (lowest traffic)
- Avoid: Fridays, weekends, holidays
- Allow 2-hour buffer before end of work day

---

## Estimated Deployment Time

| Phase | Duration | Notes |
|-------|----------|-------|
| Pre-deployment validation | 5-10 min | Depends on test suite size |
| Backup creation | 1-2 min | Manual steps required |
| Build application | 3-5 min | Depends on project size |
| Run tests | 2-5 min | Can be skipped if needed |
| Deploy Firebase rules | 1-2 min | Usually fast |
| Run migrations | 2-10 min | Depends on data volume |
| Deploy application | 3-5 min | CDN propagation time |
| Post-deployment validation | 2-3 min | Plus 1 min wait time |
| **Total** | **20-40 min** | Full deployment cycle |

**Dry run**: 10-15 minutes (skips deployment steps)

---

## Security Considerations

### Secrets Management

- Never commit secrets to repository
- Use GitHub Secrets for CI/CD
- Rotate tokens regularly
- Use least privilege access

### Pre-Deployment Security Checks

The automation includes:
- npm audit for vulnerabilities
- Security header verification
- SSL certificate validation
- Debug endpoint protection

### Post-Deployment Security Validation

- Verify security headers
- Check SSL/TLS configuration
- Confirm debug endpoints are blocked
- Validate authentication flows

---

## Support

### Getting Help

1. Check this documentation
2. Review deployment logs
3. Check Firebase Console
4. Review GitHub Actions logs
5. Contact DevOps team

### Documentation Updates

This documentation should be updated when:
- New deployment steps are added
- Scripts are modified
- New issues are discovered
- Deployment process changes

---

## Summary

The deployment automation system provides:

✅ **Comprehensive validation** before and after deployment
✅ **Automated pipeline** with GitHub Actions
✅ **Real-time monitoring** capabilities
✅ **One-command rollback** for emergencies
✅ **Dry-run mode** for safe testing
✅ **Detailed logging** for troubleshooting

**Quick Reference**:
```bash
# Full deployment
bash scripts/deploy-production.sh production false

# Dry run
bash scripts/deploy-production.sh production true

# Monitor deployment
bash scripts/monitor-deployment.sh https://your-app.com 30

# Rollback if needed
bash scripts/rollback-deployment.sh <commit-hash>
```

**Remember**: Always test in staging first, create backups, and monitor after deployment!

---

*Last updated: 2025-12-01*
*Maintained by: DevOps Team*
