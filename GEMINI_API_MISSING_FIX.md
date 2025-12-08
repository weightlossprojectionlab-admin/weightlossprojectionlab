# Gemini API Missing in Production - Fix Guide

**Issue:** AI meal analyzer is using mock data in production
**Root Cause:** `GEMINI_API_KEY` environment variable not set in Netlify deployment

---

## Problem

The meal analyzer is returning mock data in production because:

1. Code checks for `process.env.GEMINI_API_KEY` (line 149 in `app/api/ai/analyze-meal/route.ts`)
2. If not found, it logs: `GEMINI_API_KEY not set, using mock data`
3. Returns mock analysis with `isMockData: true` flag

---

## Solution - Add to Netlify Environment Variables

### Step 1: Get Your API Key

Your Gemini API key (from `.env.local`):
```
GEMINI_API_KEY=AIzaSyCzhmblvbBdk7i7GD-Ok330HYCpR-m6Q58
```

### Step 2: Add to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your site: `weightlossprojectionlab`
3. Navigate to: **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyCzhmblvbBdk7i7GD-Ok330HYCpR-m6Q58`
   - **Scopes:** Production, Deploy previews, Branch deploys (all)

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (~2-3 minutes)

---

## Verification

After redeployment, test the AI analyzer:

1. Go to https://weightlossprojectionlab.com/log-meal
2. Capture a meal photo
3. Wait for AI analysis
4. Check that `isMockData` is **false** in the response
5. Verify nutritional data looks accurate (not random mock data)

---

## Why This Happened

1. Environment variables in `.env.local` are **local only**
2. They are **NOT** automatically deployed to Netlify
3. Each deployment environment needs its own variables configured
4. The code has a fallback to mock data (by design) when the API key is missing

---

## Affected Features

Without `GEMINI_API_KEY`, the following features use mock data:
- ❌ Meal photo analysis (`/api/ai/analyze-meal`)
- ❌ AI health insights (`/api/ai/health`)
- ❌ AI chat assistant (`/api/ai/chat`)
- ❌ Weight trend analysis (`/api/ai/analyze-weight`)

With `GEMINI_API_KEY` properly configured:
- ✅ Real AI-powered meal analysis
- ✅ Accurate nutritional estimation
- ✅ Personalized health insights
- ✅ Intelligent chat responses

---

## Updated Documentation

Updated `netlify.toml` to mark `GEMINI_API_KEY` as **Required** (was listed as optional).

**Before:**
```toml
# Optional:
# - NEXT_PUBLIC_GEMINI_API_KEY
```

**After:**
```toml
# Required:
# - GEMINI_API_KEY (for AI meal analysis)
```

---

## Rate Limits

Free tier Gemini API limits:
- **10 requests per minute**
- **500 requests per day**

The app has rate limiting built-in to respect these limits. If exceeded, it will temporarily fall back to mock data until the limit resets.

---

## Quick Checklist

- [ ] Copy API key from `.env.local`: `GEMINI_API_KEY=AIzaSy...`
- [ ] Add to Netlify environment variables
- [ ] Trigger new deployment
- [ ] Test meal analyzer in production
- [ ] Verify `isMockData: false` in responses
- [ ] Confirm accurate nutritional analysis

---

**Updated:** December 7, 2025
**Priority:** HIGH - Main feature not working in production
