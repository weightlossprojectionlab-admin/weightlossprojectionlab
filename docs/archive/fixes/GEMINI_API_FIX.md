# Gemini API Fix - Model Migration Guide

## Problem Summary

The Gemini Vision API for food analysis was failing with 404 errors in production:

```
[GoogleGenerativeAI Error]: Error fetching from
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent:
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

## Root Cause

**ALL Gemini 1.5 models (gemini-1.5-flash, gemini-1.5-flash-latest, gemini-1.5-pro) have been RETIRED by Google in 2025.**

All API requests to these models now return 404 errors.

## Solution

Migrated from `gemini-1.5-flash-latest` to `gemini-2.0-flash-exp`:

- **Old Model:** `gemini-1.5-flash-latest` (RETIRED)
- **New Model:** `gemini-2.0-flash-exp` (Available, vision-capable)

### Why gemini-2.0-flash-exp?

1. **Vision Capabilities:** Native image understanding for food analysis
2. **Performance:** 2x faster than gemini-1.5-pro
3. **Availability:** Currently available via Google AI API (free tier)
4. **Context Window:** 1 million tokens (handles detailed prompts)
5. **Multimodal:** Supports text + image inputs
6. **Cost:** Same free tier (10 req/min, 500 req/day)

## Files Changed

### 1. `app/api/ai/analyze-meal/route.ts`
- Line 168: Updated model from `gemini-1.5-flash-latest` to `gemini-2.0-flash-exp`
- Line 350: Updated diagnostics model reference

### 2. `app/api/ai/health/route.ts`
- Line 40: Updated health check model from `gemini-1.5-flash` to `gemini-2.0-flash-exp`
- Line 51: Updated diagnostics model reference

## Verification Steps

### Local Development Testing

1. **Check environment variable is set:**
   ```bash
   echo $GEMINI_API_KEY  # Unix/Mac
   echo %GEMINI_API_KEY% # Windows
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/ai/health
   ```

   Expected response:
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

4. **Test food analysis endpoint:**
   - Log into the app at http://localhost:3000
   - Navigate to "Log Meal" page
   - Upload a food image
   - Click "Analyze with AI"
   - Verify analysis returns real data (not mock)
   - Check diagnostics in response: `_diagnostics.dataSource` should be `"gemini"`

### Production Testing (Netlify)

1. **Verify environment variable:**
   - Go to Netlify dashboard
   - Navigate to: Site Settings > Environment Variables
   - Confirm `GEMINI_API_KEY` is set
   - Value should start with `AIza...` (39 characters)

2. **Deploy changes:**
   ```bash
   git add app/api/ai/analyze-meal/route.ts app/api/ai/health/route.ts
   git commit -m "Fix: Migrate from gemini-1.5-flash to gemini-2.0-flash-exp"
   git push origin fix/documents-csrf-roles-indexes
   ```

3. **Test health endpoint in production:**
   ```bash
   curl https://your-app.netlify.app/api/ai/health
   ```

4. **Monitor Netlify Function logs:**
   - Netlify Dashboard > Functions > ai-analyze-meal
   - Look for log entries:
     ```
     [INFO] Calling Google Gemini Vision API
     ```
   - Should NOT see:
     ```
     [ERROR] Gemini API Error - Falling back to mock data
     ```

5. **Test end-to-end in production:**
   - Visit production app
   - Log in with test account
   - Upload food image
   - Verify real AI analysis (not mock)
   - Check response diagnostics: `_diagnostics.isRealAnalysis: true`

## Troubleshooting

### Issue: Health endpoint returns 500

**Cause:** `GEMINI_API_KEY` not set in environment

**Solution:**
1. Add to `.env.local` (development):
   ```
   GEMINI_API_KEY=AIza...your-key-here
   ```

2. Add to Netlify (production):
   - Netlify Dashboard > Site Settings > Environment Variables
   - Add variable: `GEMINI_API_KEY`
   - Value: Your Google AI API key

### Issue: Still getting 404 errors

**Possible causes:**
1. **Old deployment:** Clear Netlify cache and redeploy
2. **API key invalid:** Regenerate key at https://makersuite.google.com/app/apikey
3. **Model not available in region:** Try fallback model `gemini-2.5-flash`

**Debug steps:**
```bash
# Check health endpoint
curl https://your-app.netlify.app/api/ai/health

# Check for model name in logs
# Should show "gemini-2.0-flash-exp" not "gemini-1.5-flash"
```

### Issue: Mock data still being returned

**Possible causes:**
1. **Rate limit exceeded:** Check diagnostics for `dataSource: "mock_rate_limit"`
2. **API error:** Check Netlify logs for actual error message
3. **API key missing:** Check diagnostics for `dataSource: "mock_no_api_key"`

**Debug response:**
```json
{
  "_diagnostics": {
    "isRealAnalysis": false,
    "dataSource": "mock_rate_limit",  // or "mock_api_error", "mock_no_api_key"
    "error": "Rate limit: 10 requests per minute"
  }
}
```

## Alternative Models (If Needed)

If `gemini-2.0-flash-exp` becomes unavailable, use these fallbacks:

### Option 1: Gemini 2.5 Flash (Stable)
```typescript
model: 'gemini-2.5-flash'
```
- **Status:** Stable, production-ready
- **Vision:** Limited (may need separate image model)
- **Speed:** Very fast
- **Best for:** High-volume, low-latency use cases

### Option 2: Gemini 3 Pro Image Preview
```typescript
model: 'gemini-3-pro-image-preview'
```
- **Status:** Preview (experimental)
- **Vision:** Excellent (includes image generation)
- **Speed:** Medium
- **Cost:** Higher than Flash models
- **Best for:** Highest quality analysis

### Option 3: Gemini 2.5 Flash Image
```typescript
model: 'gemini-2.5-flash-image'
```
- **Status:** Specialized for image tasks
- **Vision:** State-of-the-art
- **Cost:** $0.039 per image
- **Best for:** Image-heavy applications

## Environment Variable Checklist

### Development (.env.local)
```bash
GEMINI_API_KEY=AIza...your-key-here
```

### Production (Netlify)
- [ ] `GEMINI_API_KEY` set in Netlify Environment Variables
- [ ] Value starts with `AIza` (39 characters)
- [ ] Key has Gemini API access enabled
- [ ] Free tier limits: 10 req/min, 500 req/day

### Get Your API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy key (starts with `AIza`)
5. Add to environment variables

## Monitoring in Production

### Success Indicators
- Health endpoint returns 200
- `geminiConnectivity.status: "PASSED"`
- `geminiConnectivity.model: "gemini-2.0-flash-exp"`
- Food analysis returns `_diagnostics.dataSource: "gemini"`

### Failure Indicators
- Health endpoint returns 500
- Logs show "Gemini API Error - Falling back to mock data"
- Food analysis returns `_diagnostics.dataSource: "mock_api_error"`

### Netlify Function Logs
```bash
# Look for these log entries:
[INFO] Calling Google Gemini Vision API
# NOT:
[ERROR] Gemini API Error - Falling back to mock data
```

## Rate Limits

Current implementation has TWO layers of rate limiting:

1. **Google Gemini API (Free Tier):**
   - 10 requests per minute
   - 500 requests per day

2. **Application Rate Limit (Upstash Redis):**
   - 10 requests per minute per user
   - 500 requests per day per user

If rate limit is hit, the app gracefully falls back to mock data with diagnostic info.

## Package Compatibility

- **Package:** `@google/generative-ai@0.24.1` (current version)
- **Compatible Models:** All Gemini 2.x and 3.x models
- **API Version:** v1beta (supports latest models)
- **No package upgrade needed**

## Next Steps

1. **Monitor production logs** for 24 hours after deployment
2. **Track success rate** of real AI analysis vs mock fallbacks
3. **Consider upgrading** to paid tier if free limits are hit
4. **Migrate to gemini-2.5-flash** once fully stable (no "-exp" suffix)

## References

- [Google Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API Changelog](https://ai.google.dev/gemini-api/docs/changelog)
- [Model Versions & Lifecycle](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)
- [@google/generative-ai NPM](https://www.npmjs.com/package/@google/generative-ai)
