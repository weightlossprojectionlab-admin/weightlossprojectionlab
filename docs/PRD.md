# Product Requirements Document (PRD)
## Wellness Projection Lab (WPL)

**Version:** 3.0
**Last Updated:** March 28, 2026
**Status:** Active Development
**Domain:** wellnessprojectionlab.com

---

## Executive Summary

### Product Vision
Wellness Projection Lab is an AI-powered family health management platform that enables caregivers and families to track vitals, medications, meals, appointments, and medical records for every member of their household — from newborns to seniors to pets — in one HIPAA-compliant app.

### Ideal Customer Profile (ICP)
- **Primary:** Family caregivers aged 30-55 (sandwich generation managing kids + aging parents)
- **Secondary:** Parents managing health for young children and pets
- **Tertiary:** Health-conscious individuals tracking their own wellness
- **Pain:** Scattered records across apps/folders/fridge notes, missed medications, can't share info with spouse or sitter
- **Desire:** One place for everything, peace of mind, less mental load
- **Buying trigger:** Health scare, new baby, aging parent diagnosis, or pet illness

### Value Proposition
**"Your Entire Family's Health. One Place."**
Track vitals, medications, meals, and appointments for everyone — kids, parents, grandparents, even pets. Share access with your spouse, sitter, or doctor in seconds.

### Key Success Metrics
- **Onboarding Completion:** >85% (adaptive 7-question flow)
- **Family Activation:** 60%+ of users add at least 2 family profiles in first week
- **Retention:** 60%+ weekly active users
- **Monetization:** 15% free-to-paid conversion, 25% upgrade to family plan
- **AI Accuracy:** >85% confidence in meal analysis
- **Performance:** <2s meal analysis, <1s page loads

---

## Problem Statement

### Current Pain Points for Caregivers
1. **Scattered records:** Health info spread across doctor portals, pharmacy apps, fridge notes, and text messages
2. **No sharing:** Can't give a spouse, babysitter, or adult child access to medical info easily
3. **Missed medications:** Juggling medication schedules for multiple family members
4. **No unified view:** No single dashboard for the whole family's health
5. **Pet health separate:** Vet records, vaccination schedules, and feeding logs kept in yet another system
6. **Caregiver burnout:** No tools to track the caregiver's own wellness

### User Needs
- **Unified dashboard:** See everyone's health at a glance
- **Medication tracking:** Reminders, dose logging, interaction flags
- **Caregiver sharing:** Grant access with granular permissions
- **AI-powered logging:** Snap a photo for meal tracking, auto-detect vitals
- **Cross-device sync:** Access from any device, real-time updates
- **Privacy:** HIPAA-compliant data handling

---

## Platform Overview

### Core Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Patient Profiles** | Create profiles for family members (humans + pets) with age-appropriate tracking | Shipped |
| **Vitals Tracking** | Blood pressure, heart rate, temperature, glucose, weight, steps | Shipped |
| **Medication Management** | Add meds, set reminders, log doses, flag interactions | Shipped |
| **AI Meal Logging** | Photo-based meal analysis via Gemini AI with nutrition breakdown | Shipped |
| **Weight Tracking** | Weight logs with trend analysis, BMI, goal tracking | Shipped |
| **Appointments** | Schedule and track appointments with providers | Shipped |
| **Medical Documents** | Upload, store, and organize medical documents with OCR | Shipped |
| **Health Reports** | AI-generated health summaries per patient | Shipped |
| **Recipe System** | 30+ recipes with inventory matching, AI generation, cooking mode | Shipped |
| **Shopping List** | Household + member-specific shopping lists with recipe linking | Shipped |
| **Caregiver Permissions** | Invite family members/caregivers with granular permissions matrix | Shipped |
| **Caregiver Journal** | Mood, stress, energy, sleep tracking for the caregiver's own wellness | Shipped |
| **Referral Program** | Affiliate links, commission tracking, admin dashboard | Shipped |
| **Admin Panel** | User management, recipe CRUD, referral stats, patient name editing | Shipped |
| **Subscription & Billing** | 5-tier plans via Stripe, 7-day free trial, seat-based pricing | Shipped |
| **Household Duties** | Assign care tasks (laundry, shopping, cleaning) to caregivers | In Progress |

### Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Firebase Admin SDK
- **Database:** Firebase Firestore (real-time)
- **Auth:** Firebase Authentication (email/password, Google OAuth)
- **AI:** Google Gemini 2.5 Flash (meal analysis, recipe generation, health reports)
- **Payments:** Stripe (subscriptions, webhooks)
- **Email:** Resend (transactional), SendGrid (legacy notifications)
- **Hosting:** Vercel (primary), Netlify (backup)
- **Domain:** wellnessprojectionlab.com

---

## Go-to-Market Strategy

### Positioning
Family health management platform for caregivers — not a weight loss app, not a fitness tracker. The platform that replaces 4+ apps with one.

### Homepage Messaging (Launched March 2026)
- **Hero:** "Your Entire Family's Health. One Place."
- **Value Props:** Medication tracking, unified dashboard, caregiver sharing
- **Social Proof:** Testimonial cards from caregivers
- **CTA:** "Create Your Family Health Hub" — free 7-day trial, HIPAA compliant
- **Trust:** HIPAA Compliant, Family Sharing Built In, Works on Any Device

### Acquisition Channels
1. **Outreach:** Personalized Loom video outreach to caregiver communities
2. **Social engagement:** LinkedIn/Twitter engagement with caregiver/parent accounts (build familiarity before DM)
3. **Content marketing:** Weekly YouTube videos solving caregiver pain points
4. **Referral program:** Built-in affiliate system — share link, earn commission on conversions
5. **Landing page A/B testing:** Test headline variants, track conversion rates
6. **SEO:** Caregiver-focused keywords (family health tracking, medication tracker for family, caregiver app)

### Pricing Tiers
| Plan | Monthly | Yearly | Max Profiles |
|------|---------|--------|-------------|
| Single User | $9.99 | $99 | 1 |
| Single Plus | $14.99 | $149 | 1 (+ medical tracking) |
| Family Basic | $19.99 | $199 | 3 |
| Family Plus | $29.99 | $299 | 6 |
| Family Premium | $39.99 | $399 | Unlimited |

All plans include 7-day free trial. Upgrade triggers: adding 2nd patient, hitting meal scan limit.

---

## Recently Completed (Q1 2026)

- Domain rebrand: weightlossprojectionlab.com → wellnessprojectionlab.com
- Homepage messaging overhaul for caregiver ICP
- Caregiver wellness journal (mood, stress, energy, sleep tracking)
- Referral/affiliate program with admin dashboard
- Admin patient name editing (user + admin level)
- Admin user display name editing
- AI recipe generation from name only
- Recipe inventory availability badges (correct missing count)
- Member-specific shopping lists (DRY shared utility)
- SEO metadata updated for caregiver keywords

## In Progress

- Household duties / care task assignment
- Auto-OCR on document upload → structured data extraction
- Real testimonial collection from early users

## Planned (Q2 2026)

- Onboarding overhaul (adaptive 7-question flow from PRD Implementation Plan)
- Event-driven monetization triggers
- Push notifications for medication reminders
- Native mobile wrapper (Capacitor/React Native)
- Caregiver community features

---

## Security & Compliance

- HIPAA compliant data handling
- Firebase security rules with owner-only and permission-based access
- CSRF protection on all mutation endpoints
- Admin audit logging for all user/patient modifications
- Rate limiting on AI and auth endpoints
- 256-bit AES encryption for sensitive data

---

## Success Criteria

### Engagement
- 60%+ of users add at least 2 family profiles in first week
- 70%+ of active users log at least 1 health event per day (vitals, meal, or medication)
- Caregiver journal used by 30%+ of users managing 2+ patients

### Monetization
- 15% free → paid conversion (triggered by scan limits or 2nd patient)
- 25% single → family plan upgrade (triggered by family member add)
- Referral program generates 10%+ of new signups

### Retention
- 60%+ weekly active users
- <5% monthly churn on paid plans
- NPS score >40

---

## References

- Previous PRD (v1.7.3, Oct 2025): `docs/PRD_ARCHIVE/PRD.md`
- PRD Implementation Plan (onboarding): `docs/PRD_IMPLEMENTATION_PLAN.md`
- Comprehensive PRD JSON: `docs/PRD_ARCHIVE/PRD_COMPREHENSIVE.json`
