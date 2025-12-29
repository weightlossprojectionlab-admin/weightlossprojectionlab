# Landing Page Marketing Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN MARKETING PANEL                     │
│                  /admin/marketing                            │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         ┌──────▼──────┐         ┌─────▼──────┐
         │  Overview   │         │  Landing   │
         │     Tab     │         │  Pages Tab │
         └──────┬──────┘         └─────┬──────┘
                │                      │
                │                      │
         ┌──────▼──────────────────────▼──────┐
         │   Ad Generator Modal               │
         │   - Persona Selection              │
         │   - Template Selection             │
         │   - Platform Selection             │
         │   - Customization                  │
         └────────────┬───────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   90 Ad Templates      │
         │   (30 personas × 3)    │
         └────────┬───────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
   Hero       Feature      Pain Point
   Ad          Ad            Ad
```

## Data Flow

```
Landing Page Personas (30)
         │
         ├─► Health Conditions (10)
         │   ├─► Diabetes
         │   ├─► Heart Health
         │   ├─► PCOS
         │   ├─► Thyroid
         │   └─► ...
         │
         ├─► Lifestyle (10)
         │   ├─► Busy Moms
         │   ├─► Working Professionals
         │   ├─► Seniors
         │   └─► ...
         │
         ├─► Diet Preferences (5)
         │   ├─► Vegetarian
         │   ├─► Vegan
         │   ├─► Keto
         │   └─► ...
         │
         └─► Pain Points (5)
             ├─► Quick Logging
             ├─► No Calorie Counting
             └─► ...

Each Persona Contains:
   ├─► Target Audience
   ├─► Pain Points
   ├─► Key Features
   ├─► Emotional Triggers
   ├─► Ad Keywords
   ├─► Recommended Platforms
   └─► Landing Page URL
```

## Ad Generation Flow

```
1. PERSONA SELECTION
   ┌─────────────────────────┐
   │ Select from 30 personas │
   │ - Search/Filter         │
   │ - View Details          │
   │ - Click Generate 🎨     │
   └───────────┬─────────────┘
               │
2. TEMPLATE GENERATION
   ┌───────────▼─────────────┐
   │ Auto-generate 3 types:  │
   │ ✓ Hero Ad               │
   │ ✓ Feature Highlight     │
   │ ✓ Pain Point Ad         │
   └───────────┬─────────────┘
               │
3. PLATFORM SELECTION
   ┌───────────▼─────────────┐
   │ Choose platforms:       │
   │ □ Instagram Feed        │
   │ □ Instagram Story       │
   │ □ Facebook Feed         │
   │ □ Facebook Story        │
   │ □ Twitter               │
   │ □ Pinterest             │
   │ □ LinkedIn              │
   └───────────┬─────────────┘
               │
4. CUSTOMIZATION
   ┌───────────▼─────────────┐
   │ Customize:              │
   │ - Pricing ($9.99/mo)    │
   │ - Background Type       │
   │   • Gradient            │
   │   • Abstract            │
   │   • Stock Photo         │
   │   • AI Generated        │
   └───────────┬─────────────┘
               │
5. GENERATION & EXPORT
   ┌───────────▼─────────────┐
   │ Generate ad images:     │
   │ - Correct dimensions    │
   │ - Brand colors          │
   │ - Persona messaging     │
   │ - Download all formats  │
   └───────────┬─────────────┘
               │
6. CAMPAIGN DEPLOYMENT
   ┌───────────▼─────────────┐
   │ Upload to platforms     │
   │ Link to landing page    │
   │ Track with UTM params   │
   └─────────────────────────┘
```

## User Journey

```
┌──────────────┐
│   Ad Seen    │  Facebook/Instagram/etc.
│  on Social   │
└──────┬───────┘
       │
       │ Click
       │
┌──────▼────────────────────┐
│   Landing Page            │
│   /landing/{persona}.html │
│                           │
│   - Persona-specific      │
│   - Pain points addressed │
│   - Clear CTA             │
│   - Features highlighted  │
└──────┬────────────────────┘
       │
       │ Click "Start Free Trial"
       │
┌──────▼───────┐
│   Sign Up    │
│   /auth      │
└──────────────┘
```

## Campaign Tracking Flow

```
Ad Platform → Landing Page → Sign Up
     │             │            │
     │             │            │
     ▼             ▼            ▼
UTM Source    UTM Campaign   Conversion
(facebook)    (diabetes)     (tracked)
     │             │            │
     └─────────────┴────────────┘
                   │
                   ▼
          Analytics Dashboard
          - Source performance
          - Campaign ROI
          - Conversion rates
          - Cost per acquisition
```

## Platform Recommendations by Persona

### Health Conditions → Facebook + Pinterest
- **Why**: Older demographic, health-conscious
- **Examples**: Diabetes, Heart Health, Thyroid
- **Formats**: Feed posts (1:1), Pinterest pins (2:3)

### Lifestyle (Young) → Instagram + Twitter
- **Why**: Younger demographic, visual platform
- **Examples**: College Students, Athletes
- **Formats**: Stories (9:16), Feed (4:5)

### Lifestyle (Parents) → Facebook + Pinterest
- **Why**: Parent demographic active on FB/Pinterest
- **Examples**: Busy Moms, Single Parents
- **Formats**: Feed posts, Pinterest pins

### Professional → LinkedIn + Instagram
- **Why**: Career-focused, professional image
- **Examples**: Working Professionals, Traveling Professionals
- **Formats**: LinkedIn (1.91:1), Instagram Feed

### Diet Preferences → Instagram + Pinterest
- **Why**: Food photos, recipe sharing
- **Examples**: Vegan, Keto, Mediterranean
- **Formats**: Instagram Feed (4:5), Pinterest (2:3)

## Template Variations

```
PERSONA: Diabetes Weight Loss
├─► Hero Ad
│   Headline: "Manage Diabetes & Lose Weight"
│   Hook: "Prevent diabetes through weight loss"
│   CTA: "Start Free Trial"
│
├─► Feature Ad
│   Headline: "Blood sugar tracking"
│   Hook: "Track vitals and medications"
│   CTA: "See How It Works"
│
└─► Pain Point Ad
    Headline: "Struggling with blood sugar management?"
    Hook: "Finally get control"
    CTA: "Find Your Solution"
```

## Color Schemes by Category

```
Health Conditions
├─► Primary: #0EA5E9 (Sky Blue - trust)
├─► Secondary: #10B981 (Green - health)
└─► Accent: #F59E0B (Orange - urgency)

Lifestyle
├─► Primary: #8B5CF6 (Purple - energy)
├─► Secondary: #EC4899 (Pink - motivation)
└─► Accent: #10B981 (Green - success)

Diet Preferences
├─► Primary: #059669 (Emerald - natural)
├─► Secondary: #10B981 (Green - healthy)
└─► Accent: #F59E0B (Orange - warm)

Pain Points
├─► Primary: #7C3AED (Violet - bold)
├─► Secondary: #3B82F6 (Blue - calm)
└─► Accent: #EF4444 (Red - attention)
```

## Integration Points

### Frontend
```
app/(dashboard)/admin/marketing/page.tsx
  ├─► LandingPageManager (Browse personas)
  └─► AdGeneratorModal (Generate ads)

components/admin/LandingPageManager.tsx
  ├─► Persona cards with search/filter
  ├─► Detailed persona modal
  └─► Quick ad generation

components/ads/AdGeneratorModal.tsx
  ├─► Multi-step wizard
  ├─► Platform selection
  └─► Ad preview & export
```

### Backend/Data
```
lib/landing-page-personas.ts
  └─► 30 persona definitions

lib/landing-page-ad-generator.ts
  ├─► Template generation
  ├─► Platform recommendations
  └─► UTM tracking URLs

lib/ad-generator.ts
  ├─► Canvas-based image generation
  ├─► Platform-specific dimensions
  └─► Text rendering

lib/ad-background-generator.ts
  ├─► Gradient backgrounds
  ├─► Abstract patterns
  ├─► Stock photo integration
  └─► AI image generation
```

## Success Metrics

### Ad Performance
- **CTR Goal**: 2-3% (industry average: 0.9%)
- **Conversion Goal**: 5-8% (landing page to signup)
- **Cost per Click**: $0.50 - $2.00 depending on platform
- **Cost per Acquisition**: $10 - $40

### Persona Performance Tracking
Track each of the 30 personas:
- Which personas convert best
- Which platforms work for each persona
- Which ad templates perform best
- A/B test variations

### Campaign Optimization
- Test different emotional hooks
- Test different CTAs
- Test background styles
- Test pricing displays
