# Gemini API Fix - Deployment Checklist

## Critical Fix Summary

Fixed CRITICAL food analysis API failure caused by Google retiring Gemini 1.5 models in 2025.

**Status:** READY FOR DEPLOYMENT

---

## What Was Fixed

### Root Cause
- Gemini 1.5 Flash models (`gemini-1.5-flash`, `gemini-1.5-flash-latest`) retired by Google
- All API requests to these models return 404 errors
- Food analysis API was completely broken in production

### Solution
- Migrated to `gemini-2.0-flash-exp` (Gemini 2.0 Flash Experimental)
- Updated both food analysis endpoint AND health check endpoint
- Model is vision-capable, 2x faster, and fully compatible

---

## Files Changed

```
M app/api/ai/analyze-meal/route.ts  (lines 168, 350)
M app/api/ai/health/route.ts        (lines 40, 51)
M .env.local.example                (line 18)
+ GEMINI_API_FIX.md                 (new documentation)
+ DEPLOYMENT_CHECKLIST.md           (this file)
```

---

## Pre-Deployment Checklist

### 1. Code Review
- [x] Model identifier changed from `gemini-1.5-flash-latest` to `gemini-2.0-flash-exp`
- [x] Health endpoint updated to use new model
- [x] Diagnostics updated to report correct model name
- [x] All references to old model removed
- [x] Comments updated to reflect new model

### 2. Environment Variables
- [ ] **CRITICAL:** Verify `GEMINI_API_KEY` is set in Netlify
  - Go to: Netlify Dashboard > Site Settings > Environment Variables
  - Key: `GEMINI_API_KEY`
  - Value: Should start with `AIza` (39 characters)
  - Get key at: https://makersuite.google.com/app/apikey

### 3. Documentation
- [x] Created GEMINI_API_FIX.md with detailed explanation
- [x] Created this deployment checklist
- [x] Updated .env.local.example with model info

---

## Deployment Steps

### Step 1: Commit Changes
```bash
git add app/api/ai/analyze-meal/route.ts app/api/ai/health/route.ts .env.local.example GEMINI_API_FIX.md DEPLOYMENT_CHECKLIST.md
git commit -m "Fix: Migrate Gemini API from retired 1.5-flash to 2.0-flash-exp

CRITICAL FIX: Google retired all Gemini 1.5 models in 2025.
Food analysis API was failing with 404 errors.

Changes:
- Updated model from gemini-1.5-flash-latest to gemini-2.0-flash-exp
- Fixed health endpoint to use new model
- Gemini 2.0 Flash: vision-capable, 2x faster, same free tier
- Added comprehensive documentation in GEMINI_API_FIX.md

Fixes food analysis API errors in production."
git push origin fix/documents-csrf-roles-indexes
```

### Step 2: Verify Netlify Environment
1. **Open Netlify Dashboard**
   - Site: weightlossprojectionlab (or your site)

2. **Check Environment Variables**
   - Navigate to: Site Settings > Environment Variables
   - Verify `GEMINI_API_KEY` exists
   - Value should be 39 characters starting with `AIza`

3. **If missing or invalid:**
   ```
   1. Visit https://makersuite.google.com/app/apikey
   2. Sign in with Google account
   3. Create new API key
   4. Copy key (AIza...)
   5. Add to Netlify environment variables
   ```

### Step 3: Deploy to Production
- Netlify will auto-deploy when you push to the branch
- OR manually trigger deploy in Netlify Dashboard

### Step 4: Monitor Deployment
1. **Watch build logs:**
   - Netlify Dashboard > Deploys > [Latest Deploy]
   - Wait for "Site is live" message

2. **Check function logs:**
   - Netlify Dashboard > Functions > ai-analyze-meal
   - Look for successful initialization

---

## Post-Deployment Verification

### Test 1: Health Endpoint
```bash
curl https://your-production-url.netlify.app/api/ai/health
```

**Expected Response:**
```json
{
  "timestamp": "2025-12-07T...",
  "environment": {
    "geminiApiKeyExists": true,
    "geminiApiKeyLength": 39
  },
  "tests": {
    "geminiApiKey": {
      "status": "PASSED"
    },
    "geminiConnectivity": {
      "status": "PASSED",
      "model": "gemini-2.0-flash-exp",
      "message": "Successfully connected to Gemini API"
    }
  }
}
```

**Status:** 200 OK

### Test 2: Food Analysis API (Manual)
1. **Login to production app**
2. **Navigate to "Log Meal"**
3. **Upload a food image** (e.g., chicken, rice, vegetables)
4. **Click "Analyze with AI"**
5. **Verify response contains:**
   ```json
   {
     "success": true,
     "data": {
       "foodItems": [...],
       "totalCalories": 550,
       "totalMacros": {...}
     },
     "_diagnostics": {
       "isRealAnalysis": true,
       "dataSource": "gemini",
       "model": "gemini-2.0-flash-exp"
     }
   }
   ```

**Success Criteria:**
- [ ] Response has `"isRealAnalysis": true`
- [ ] Response has `"dataSource": "gemini"` (NOT "mock_api_error")
- [ ] Food items are analyzed correctly
- [ ] Response time < 10 seconds
- [ ] No errors in Netlify function logs

### Test 3: Check Netlify Function Logs
```
Navigate to: Netlify Dashboard > Functions > ai-analyze-meal > Recent logs

GOOD SIGNS:
[INFO] Calling Google Gemini Vision API
[INFO] USDA validation complete

BAD SIGNS:
[ERROR] Gemini API Error - Falling back to mock data
[ERROR] 404 Not Found
```

---

## Troubleshooting

### Issue: Health endpoint returns 500
**Cause:** `GEMINI_API_KEY` not set

**Fix:**
1. Add to Netlify Environment Variables
2. Redeploy site
3. Test again

---

### Issue: Still getting 404 errors
**Cause:** Old deployment cached

**Fix:**
1. Netlify Dashboard > Site Settings > Build & Deploy
2. Click "Clear cache and retry deploy"
3. OR: Trigger new deploy manually

---

### Issue: Mock data still being returned
**Cause:** API error or rate limit

**Fix:**
1. Check response diagnostics:
   ```json
   "_diagnostics": {
     "dataSource": "mock_rate_limit",  // or mock_api_error
     "error": "Rate limit: 10 requests per minute"
   }
   ```
2. If rate limit: Wait 1 minute and retry
3. If API error: Check Netlify logs for actual error message

---

### Issue: "Model not found" error
**Cause:** Model name incorrect or not available

**Fix:**
1. Try fallback model: `gemini-2.5-flash`
2. Check Google's model availability
3. Verify API key has correct permissions

---

## Success Metrics

### Immediate (First 1 hour)
- [ ] Health endpoint returns 200 OK
- [ ] geminiConnectivity test passes
- [ ] Food analysis returns real data (not mock)
- [ ] No 404 errors in Netlify logs

### Short-term (First 24 hours)
- [ ] 95%+ of food analysis requests use real AI (not mock)
- [ ] Average response time < 5 seconds
- [ ] No API errors in logs
- [ ] User feedback is positive

### Long-term (First week)
- [ ] Zero 404 errors from Gemini API
- [ ] Rate limits not exceeded
- [ ] Food analysis accuracy remains high
- [ ] USDA validation continues working

---

## Rollback Plan (If Needed)

If deployment fails catastrophically:

1. **Revert changes:**
   ```bash
   git revert HEAD
   git push origin fix/documents-csrf-roles-indexes
   ```

2. **Use alternative model:**
   - Change model to `gemini-2.5-flash` (stable)
   - OR use mock data until fixed

3. **Contact support:**
   - Google AI Support: https://discuss.ai.google.dev/

---

## Alternative Models (Future)

If `gemini-2.0-flash-exp` becomes unavailable:

### Option 1: gemini-2.5-flash
- Status: Stable, production-ready
- Change: Line 168 in analyze-meal/route.ts
- Vision: Limited (may need adjustments)

### Option 2: gemini-3-pro-image-preview
- Status: Preview (experimental)
- Vision: Excellent
- Cost: Higher

### Option 3: gemini-2.5-flash-image
- Status: Specialized for images
- Cost: $0.039 per image

---

## Next Steps After Deployment

1. **Monitor for 24 hours:**
   - Check Netlify logs every few hours
   - Monitor success rate of real AI vs mock data
   - Watch for any new error patterns

2. **Gather user feedback:**
   - Test with real food images
   - Verify accuracy of analysis
   - Check response times

3. **Consider future improvements:**
   - Multi-model fallback strategy
   - Configurable model via environment variable
   - A/B testing different models

4. **Update documentation:**
   - Add learnings to team wiki
   - Document any edge cases found
   - Update troubleshooting guide

---

## Contact Info

**Gemini API Support:**
- Forum: https://discuss.ai.google.dev/
- Docs: https://ai.google.dev/gemini-api/docs/models

**Package Support:**
- NPM: https://www.npmjs.com/package/@google/generative-ai
- GitHub: https://github.com/google/generative-ai-js

---

## Deployment Sign-Off

- [x] Code changes reviewed and tested locally
- [ ] Environment variables verified in Netlify
- [ ] Documentation complete
- [ ] Deployment plan understood
- [ ] Verification tests ready
- [ ] Rollback plan in place

**Ready to deploy:** YES / NO

**Deployed by:** _____________

**Deploy date/time:** _____________

**Verification completed:** YES / NO

**Production status:** WORKING / ISSUES

**Notes:**
