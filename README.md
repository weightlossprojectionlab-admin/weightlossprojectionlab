# Wellness Projection Lab (WPL) v2

A comprehensive health tracking platform powered by proprietary machine learning technology, built with Next.js 15, featuring biometric authentication and advanced meal analysis capabilities.

## 📋 Product Requirements

**For complete product requirements, features, roadmap, and technical specifications, see:**
**[`MASTER_PRD.md`](./MASTER_PRD.md)** - The authoritative Product Requirements Document

This PRD includes:
- Product vision and evolution (v1.5 → v3.0)
- User modes (Single/Household/Caregiver) with adaptive UI
- Complete feature catalog (287 features)
- Monetization strategy (Free/Premium/Family tiers)
- Data models and technical architecture
- Success metrics and roadmap through 2026

## 🎯 Project Overview

WPL v2 is a simplified, mobile-first weight loss tracking app that focuses on core functionality without enterprise complexity. This version includes:

- **Computer Vision Meal Analysis**: Take photos of meals for instant nutrition estimates using proprietary WPL Vision™ technology
- **Biometric Authentication**: Secure login with Touch ID/Face ID using WebAuthn
- **Mobile-First Design**: Fully responsive with WCAG 2.1 AA accessibility compliance
- **HIPAA-Secure Backend**: Clean, flat Firebase database structure with clinical-grade security
- **Modern UX**: Toast notifications and custom confirmation modals for better user experience
- **Hybrid AI + Self-Teaching ML**: Gemini Vision for photo-based capture (meals, medical document OCR); self-teaching ML — running on WPL-owned infrastructure — for personalization, projections, recommendations, and insights

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15.4.6** with App Router and Turbopack
- **React 19.1.0** with TypeScript
- **Tailwind CSS v4** for styling
- **Mobile-first responsive design** (320px-768px primary focus)

### Backend Stack
- **Firebase Firestore** (HIPAA-secure flat collections)
- **Firebase Authentication** + WebAuthn for biometrics
- **Gemini Vision** for meal image analysis (branded as WPL Vision™ in product UI)
- **Self-teaching ML models** (WPL-owned) for personalization, projections, and recommendations
- **USDA FoodData Central API** for nutrition data validation

### Key Features
- ✅ Biometric authentication (Touch ID/Face ID)
- ✅ Camera-based meal logging with AI analysis
- ✅ Initial weight capture during onboarding (accountability model)
- ✅ Step counting with device integration
- ✅ Mobile-optimized dashboard
- ✅ ARIA accessibility compliance
- ✅ Progressive Web App capabilities

## 📁 Project Structure

```
weightlossprojectlab/
├── agents/                     # Agent configurations
│   ├── README.md              # Agent team overview
│   ├── frontend-agent.md      # Frontend development specs
│   ├── backend-agent.md       # Backend & Firebase specs
│   ├── ai-agent.md           # AI integration specs
│   └── qa-agent.md           # Testing & accessibility specs
├── app/                       # Next.js App Router
│   ├── globals.css           # Tailwind CSS + accessibility styles
│   ├── layout.tsx            # Root layout with PWA metadata
│   ├── page.tsx              # Landing page
│   ├── auth/                 # Authentication pages
│   ├── dashboard/            # Main dashboard
│   ├── log-meal/             # Meal logging with camera
│   ├── log-steps/            # Step counting
│   └── api/                  # API routes
│       └── ai/
│           └── analyze-meal/ # OpenAI Vision integration
├── lib/                      # Utility libraries
│   └── firebase.ts          # Firebase client configuration
├── types/                    # TypeScript definitions
│   └── index.ts             # Main app types
├── components/              # React components (to be created)
├── .env.local              # Environment variables (configured)
└── service_account_key.json # Firebase Admin credentials
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (configured)
- Google Gemini API key (free tier available)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**

   ⚠️ **IMPORTANT: Never commit `.env.local` to git!** It contains sensitive API keys.

   Copy the example file and add your API keys:
   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local` and add your credentials:
   ```bash
   # Required: Google Gemini API key (get free key at https://makersuite.google.com/app/apikey)
   GEMINI_API_KEY=your-gemini-api-key

   # Optional: USDA Food Data API key
   USDA_API_KEY=your-usda-api-key

   # Firebase credentials (get from Firebase Console)
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   # ... (see .env.local.example for full list)
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

### 🔐 Security

#### Comprehensive Security Controls

This application implements defense-in-depth security architecture across multiple layers:

**🛡️ Security Features** (Sprint 1 & 2 - All CRITICAL + HIGH issues resolved):

| Control | Status | Description |
|---------|--------|-------------|
| **SSRF Protection** | ✅ Complete | Domain whitelist + IP blocklist for external requests |
| **Rate Limiting** | ✅ Complete | Distributed rate limiting with Upstash Redis |
| **CSRF Protection** | ⚠️ Partial | Client-side tokens (server middleware pending) |
| **CORS Hardening** | ⚠️ Partial | Origin whitelist enforcement |
| **Security Headers** | ⚠️ Partial | Basic headers (CSP pending) |
| **Authentication** | ✅ Complete | Firebase Auth with Custom Claims RBAC |
| **Storage Security** | ✅ Complete | User-scoped document paths |
| **Error Sanitization** | ⚠️ Partial | Production-safe error responses (foundation ready) |
| **Debug Guards** | ✅ Complete | Production kill switches for debug endpoints |
| **Recipe DB Protection** | ✅ Complete | Authentication + pagination enforcement |

**Legend**: ✅ Complete | ⚠️ Partial (foundation ready, integration pending) | ❌ Not Started

#### Security Documentation

Comprehensive security documentation for developers and operators:

- **[Security Runbook](docs/SECURITY_RUNBOOK.md)** - Incident response procedures and emergency protocols
- **[Developer Security Guidelines](docs/DEVELOPER_SECURITY_GUIDELINES.md)** - Secure coding practices and patterns
- **[Security Architecture](docs/SECURITY_ARCHITECTURE.md)** - Technical security design and threat model
- **[Sprint 1 & 2 Completion Report](docs/SPRINT_1_2_COMPLETION_REPORT.md)** - Detailed security fixes implemented

#### Security Testing

Run automated security tests:

```bash
# All security tests (75 tests)
npm test -- __tests__/security/

# Specific attack vector tests
npm test -- __tests__/api/fetch-url.test.ts  # SSRF protection (20 tests)
npm test -- __tests__/api/debug-endpoints.test.ts  # Production guards (14 tests)
npm test -- __tests__/lib/rate-limit.test.ts  # Rate limiting (14 tests)

# Dependency security audit
npm audit --audit-level=high
```

#### Reporting Security Issues

**🚨 Found a security vulnerability? Please report responsibly.**

- **Email**: security@wpl.com (or primary contact email)
- **PGP Key**: [Optional: Add PGP key for encrypted reports]
- **Response Time**: We aim to respond within 24 hours

**⚠️ DO NOT open public GitHub issues for security vulnerabilities.**

We appreciate responsible disclosure and will acknowledge your contribution (with your permission) after the issue is resolved.

#### Security Best Practices for Developers

**API Key Management:**
- ✅ `.env.local` is already in `.gitignore` - your keys are safe
- ✅ Use `.env.local.example` as a template (safe to commit)
- ❌ Never commit actual API keys to version control
- ❌ Never share your `.env.local` file

**Key Rotation (if compromised):**
1. **Gemini API**: Revoke at https://makersuite.google.com/app/apikey
2. **Firebase**: Generate new keys in Firebase Console > Project Settings > Service Accounts
3. **Upstash Redis**: Rotate tokens in Upstash Console
4. **Update `.env.local`** with new keys
5. **Restart dev server**: `npm run dev`

**Required Security Environment Variables:**
```bash
# Super Admin Management
SUPER_ADMIN_EMAILS=admin1@example.com,admin2@example.com

# CORS Configuration
ALLOWED_ORIGINS=https://app.wpl.com,https://admin.wpl.com

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

See **[Developer Security Guidelines](docs/DEVELOPER_SECURITY_GUIDELINES.md)** for complete secure coding practices.

### Available Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Key Pages & Features

### Landing Page (`/`)
- Feature overview with mobile-optimized cards
- Clear call-to-action buttons
- Accessibility-first design

### Authentication (`/auth`)
- Email/password signup and signin
- Biometric authentication (Touch ID/Face ID)
- Google OAuth integration
- Mobile-optimized forms with validation

### Dashboard (`/dashboard`)
- Weight progress visualization
- Today's nutrition summary with macros
- Activity tracking (steps)
- Quick action buttons for logging
- Self-teaching coach recommendations *(roadmap — not yet shipped)*

### Meal Logging (`/log-meal`)
- Camera integration for meal photos
- Computer vision meal analysis using proprietary WPL Vision™
- Manual entry fallback
- Nutrition data display with confidence scoring
- Meal type selection (breakfast, lunch, dinner, snack)
- Privacy-first: Your meal photos never leave our HIPAA-secure platform

### Step Logging (`/log-steps`)
- Device motion detection (basic)
- Health app sync (HealthKit/Google Fit)
- Manual entry option
- Goal progress tracking

## 🤖 AI + Self-Teaching ML Architecture

WPL uses **two distinct technology layers**:

**AI (LLM-based, Gemini Vision)** — used for instant capture tasks only:
- Meal photo analysis (food identification, portion estimation, nutrition extraction)
- Medical document OCR (parsing scanned records into structured data)

**Self-Teaching ML (WPL-owned)** — used for everything that learns from each family member over time:
- Health reports and weekly insights
- Weight projections (statistical time-series)
- Recipe recommendations (collaborative filtering)
- Shopping suggestions (rule-based + adaptive learning)
- Pattern detection across meals, vitals, and adherence
- Coaching and goal recommendations *(roadmap)*

### WPL Vision™ — Meal Analysis System
- **Powered by Google Gemini Vision** (branded as WPL Vision™ in product UI)
- **HIPAA-compliant processing** — data handled per BAA with Google
- Returns: food items, calories, macros, confidence, suggestions
- Self-teaching layer learns each family member's actual portions and food preferences from corrections over time
- Error handling with graceful fallbacks

### Messaging & Terminology Strategy
WPL implements a 3-layer messaging architecture:
- **SEO Layer**: Search-optimized terms reflecting accurate capability (AI for vision/OCR; self-teaching for personalization)
- **Marketing Layer**: Technical authority terms (landing pages, marketing content)
- **Product Layer**: Branded WPL terminology (authenticated product UI)

See **[Messaging Guidelines](./docs/MESSAGING_GUIDELINES.md)** for complete terminology reference and usage examples.

### Wellness Intelligence Features (self-teaching ML)
- Personalized health recommendations that adapt to each family member's patterns
- Weekly wellness insights
- Goal adjustment suggestions
- Pattern recognition in eating habits
- Predictive health analytics

## 🎨 Design System

### Mobile-First Approach
- **Primary**: 320px-768px (mobile)
- **Secondary**: 768px-1024px (tablet)
- **Desktop**: 1024px+ (optional)

### Accessibility (WCAG 2.1 AA)
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Minimum 44px touch targets
- Focus indicators

### Color Scheme
- CSS custom properties for theming
- Dark mode support (automatic)
- High contrast mode compatibility

## 🔧 Development Notes

### Current Status
- ✅ Project structure created
- ✅ Firebase configuration completed
- ✅ All main pages implemented
- ✅ **Google Gemini AI integration active** (migrated from OpenAI)
- ✅ Mobile-first responsive design
- ✅ Accessibility compliance
- ✅ **Modern UX with toast notifications and confirmation modals**
- ✅ **Upload progress indicators**
- ✅ Rate limiting to stay within free API tiers
- ⚠️ Some code quality improvements needed (see code review findings)
- ⚠️ WebAuthn biometric auth needs device testing
- ⚠️ Health app integration needs platform-specific code

### Known Limitations
- Rate limited to 500 Gemini API requests per day (free tier)
- WebAuthn biometric auth requires HTTPS and compatible devices
- Health app integration (HealthKit/Google Fit) needs platform-specific native code
- Some TypeScript `any` types need proper interfaces

### Next Steps
1. ✅ ~~Migrate from OpenAI to Google Gemini~~ (DONE)
2. ✅ ~~Add confirmation modals~~ (DONE)
3. ✅ ~~Add upload progress spinners~~ (DONE)
4. **Address critical security issues** (API endpoint authentication, CORS)
5. Test biometric authentication on physical devices
6. Implement image compression before upload
7. Deploy to production with environment variables

## 📝 Agent Team

This project was developed using a structured agent approach:

- **Frontend Agent**: Next.js + Tailwind CSS + Mobile UI
- **Backend Agent**: Firebase + API integration + WebAuthn
- **AI Agent**: Gemini Vision integration (meals, OCR) + self-teaching ML for recommendations
- **QA Agent**: Testing + accessibility + cross-browser compatibility

See `/agents/` directory for detailed specifications.

## 🛠️ Troubleshooting

### Common Issues
1. **Dependencies failing to install**: Try clearing node_modules and package-lock.json
2. **Firebase connection issues**: Check .env.local configuration
3. **Camera not working**: Check browser permissions and HTTPS requirement
4. **TypeScript errors**: Ensure all types are properly imported

### Support
- Check agent documentation in `/agents/` for implementation details
- Review browser console for specific error messages
- Ensure environment variables are properly set

---

**Built with simplicity and accessibility in mind. Ready for mobile users worldwide.**
<!-- Trigger rebuild after adding GEMINI_API_KEY to Netlify (2025-11-02) -->
