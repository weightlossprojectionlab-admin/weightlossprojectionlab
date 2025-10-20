# Weight Loss Progress Lab (WLPL) v2

An AI-powered weight loss tracking application built with Next.js 15, featuring biometric authentication and meal image analysis.

## 🎯 Project Overview

WLPL v2 is a simplified, mobile-first weight loss tracking app that focuses on core functionality without enterprise complexity. This version includes:

- **AI-Powered Meal Analysis**: Take photos of meals for instant nutrition estimates using Google Gemini Vision
- **Biometric Authentication**: Secure login with Touch ID/Face ID using WebAuthn
- **Mobile-First Design**: Fully responsive with WCAG 2.1 AA accessibility compliance
- **Simplified Firebase Backend**: Clean, flat database structure without enterprise features
- **Modern UX**: Toast notifications and custom confirmation modals for better user experience

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15.4.6** with App Router and Turbopack
- **React 19.1.0** with TypeScript
- **Tailwind CSS v4** for styling
- **Mobile-first responsive design** (320px-768px primary focus)

### Backend Stack
- **Firebase Firestore** (simplified flat collections)
- **Firebase Authentication** + WebAuthn for biometrics
- **Google Gemini 2.5 Flash API** for meal image analysis (free tier: 500 req/day)
- **USDA FoodData Central API** for nutrition data

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

### 🔐 Security Best Practices

**API Key Management:**
- ✅ `.env.local` is already in `.gitignore` - your keys are safe
- ✅ Use `.env.local.example` as a template (safe to commit)
- ❌ Never commit actual API keys to version control
- ❌ Never share your `.env.local` file

**Key Rotation (if compromised):**
1. **Gemini API**: Revoke at https://makersuite.google.com/app/apikey
2. **Firebase**: Generate new keys in Firebase Console > Project Settings > Service Accounts
3. **Update `.env.local`** with new keys
4. **Restart dev server**: `npm run dev`

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
- AI coach recommendations

### Meal Logging (`/log-meal`)
- Camera integration for meal photos
- AI-powered meal analysis using OpenAI Vision
- Manual entry fallback
- Nutrition data display with confidence scoring
- Meal type selection (breakfast, lunch, dinner, snack)

### Step Logging (`/log-steps`)
- Device motion detection (basic)
- Health app sync (HealthKit/Google Fit)
- Manual entry option
- Goal progress tracking

## 🤖 AI Integration

### Meal Analysis API (`/api/ai/analyze-meal`)
- **Powered by Google Gemini 2.5 Flash** (free tier: 10 req/min, 500 req/day)
- Rate limiting implemented to stay within free tier
- Returns: food items, calories, macros, confidence, suggestions
- Error handling with fallback to mock data
- Automatic fallback ensures app always works even when API limits reached

### Future AI Features
- Personalized recommendations
- Weekly health insights
- Goal adjustment suggestions
- Pattern recognition in eating habits

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
- **AI Agent**: OpenAI integration + meal analysis + recommendations
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