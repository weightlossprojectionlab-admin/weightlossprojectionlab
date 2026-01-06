# Screenshots Directory

This directory contains all product screenshots for marketing, documentation, and press materials.

## 📁 Directory Structure

Each feature has its own folder with organized screenshots:

```
screenshots/
├── dashboard/          # Main dashboard screenshots
├── meal-tracking/      # Meal logging and AI analysis
├── weight-tracking/    # Weight progress charts
├── ai-health-reports/  # AI-generated health insights
├── family-care/        # Family dashboard and collaboration
├── patient-care/       # Patient profiles and management
├── medical-documents/  # Document storage and OCR
├── medications/        # Medication tracking
├── appointments/       # Calendar and scheduling
├── vitals-tracking/    # Blood pressure, glucose, etc.
├── smart-shopping/     # AI shopping lists
├── household-duties/   # Task assignment for caregivers
├── providers/          # Healthcare provider directory
├── inventory/          # Kitchen inventory management
├── settings/           # User settings and preferences
└── mobile/             # Mobile app screenshots
```

## 📝 Naming Convention

Use this format for all screenshots:

```
{feature}-{description}-{variant}-{theme}.png
```

**Examples:**
- `dashboard-overview-desktop-light.png`
- `dashboard-overview-desktop-dark.png`
- `meal-tracking-photo-upload-mobile-light.png`
- `weight-chart-progress-desktop-light.png`

**Variants:**
- `desktop` - Desktop/web view (1920x1080 or higher)
- `mobile` - Mobile phone view (430x932 iPhone or 412x915 Android)
- `tablet` - Tablet view (1024x1366 iPad)

**Themes:**
- `light` - Light mode UI
- `dark` - Dark mode UI

## 📋 Screenshot Checklist

Before adding a screenshot, ensure:

- [ ] **Resolution**: Minimum 1920x1080 for desktop, native resolution for mobile
- [ ] **Format**: PNG (for UI elements) or JPG (for photos)
- [ ] **File Size**: < 500KB (optimize with compression)
- [ ] **Demo Data**: Use ONLY fictional/demo data (no real personal info)
- [ ] **Privacy**: No real names, emails, phone numbers, or medical data
- [ ] **Clean UI**: Close unnecessary browser tabs, hide personal bookmarks
- [ ] **Consistency**: Same demo user across all screenshots
- [ ] **Quality**: High-resolution, crisp text, no blur
- [ ] **Naming**: Follows naming convention above
- [ ] **Both Modes**: Provide light AND dark mode versions if available

## 🎨 Demo Data Guidelines

**Use these fictional demo profiles:**

### Demo User 1 (Primary)
- Name: Sarah Johnson
- Email: sarah.johnson@example.com
- Age: 34
- Starting Weight: 185 lbs
- Goal Weight: 150 lbs
- Current Weight: 170 lbs (15 lbs lost)

### Demo User 2 (Family Member)
- Name: Michael Johnson
- Email: michael.johnson@example.com
- Age: 8
- Health Condition: Type 1 Diabetes

### Demo User 3 (Elderly Patient)
- Name: Margaret Smith
- Email: margaret.smith@example.com
- Age: 72
- Medications: Lisinopril, Metformin

**Demo Meals:**
- Breakfast: Oatmeal with berries and almonds (320 cal)
- Lunch: Grilled chicken salad (450 cal)
- Dinner: Baked salmon with vegetables (520 cal)
- Snack: Greek yogurt with honey (180 cal)

**Demo Medications:**
- Lisinopril 10mg (blood pressure) - Take 1 daily
- Metformin 500mg (diabetes) - Take 2 daily with meals

**Demo Appointments:**
- Dr. Emily Chen, Cardiologist - Next Tuesday 2:00 PM
- Dr. Robert Lee, Primary Care - Next Friday 10:30 AM

## 📸 Taking Screenshots

### Desktop Screenshots (Windows)

1. **Using Snipping Tool:**
   - Press `Win + Shift + S`
   - Select area to capture
   - Save as PNG

2. **Using PowerToys:**
   - Install PowerToys
   - Use FancyZones for consistent window sizing
   - Capture with `Win + Shift + S`

3. **Browser DevTools:**
   - Open Chrome DevTools (F12)
   - Set device toolbar to specific resolution
   - Capture full page: `Ctrl + Shift + P` → "Capture full size screenshot"

### Mobile Screenshots

1. **Using Browser DevTools:**
   - F12 → Toggle device toolbar
   - Select iPhone 14 Pro (430x932) or Pixel 7 (412x915)
   - Capture screenshot

2. **Using Real Device:**
   - iPhone: `Volume Up + Power Button`
   - Android: `Volume Down + Power Button`
   - AirDrop/transfer to computer

## 🖼️ Image Optimization

After taking screenshots, optimize them:

### Online Tools
- [TinyPNG](https://tinypng.com/) - Compress PNG images
- [Squoosh](https://squoosh.app/) - Google's image compressor
- [ImageOptim](https://imageoptim.com/) - Mac app for optimization

### Command Line (ImageMagick)
```bash
# Resize and optimize
convert input.png -resize 1920x1080 -quality 90 output.png

# Batch optimize all PNGs in a folder
mogrify -format png -quality 90 *.png
```

### Next.js Auto-Optimization
- Next.js will automatically optimize images
- Serve WebP format to modern browsers
- Generate responsive sizes
- Add blur placeholders

## 📦 File Size Guidelines

- **Desktop screenshots**: 200-500 KB
- **Mobile screenshots**: 100-300 KB
- **Thumbnails**: 20-50 KB
- **High-res originals (press kit)**: 1-3 MB (keep separate)

## 🔒 Privacy & Compliance

**NEVER include:**
- Real patient names or personal information
- Real email addresses or phone numbers
- Real medical records or health data
- Real addresses or locations (use "123 Main St, Anytown, USA")
- Real credit card or billing information
- Your personal browser history or bookmarks
- Sensitive company internal data

**DO use:**
- Fictional names from lists like "John Doe", "Jane Smith"
- Example.com email addresses
- Generic placeholder data
- Stock photos for user avatars (royalty-free)
- Lorem ipsum or realistic but fake content

## 📝 Alt Text Examples

Good alt text is descriptive and specific:

✅ **Good:**
- "WPL dashboard showing weight loss progress chart with 15lb decrease over 3 months, recent meal log, and AI health insights"
- "Mobile meal tracking interface with photo upload button and AI-analyzed nutrition breakdown"
- "Family care dashboard displaying health metrics for 3 family members with quick action buttons"

❌ **Bad:**
- "Dashboard"
- "Screenshot"
- "Image of app"

## 🎯 Priority Screenshots Needed

### High Priority (Week 1)
1. Dashboard overview (desktop + mobile, light + dark)
2. Meal tracking - photo upload flow (desktop + mobile)
3. Weight progress chart (desktop)
4. AI health report (desktop)
5. Family dashboard (desktop)
6. Patient profile (desktop)

### Medium Priority (Week 2)
7. Medical documents library (desktop + mobile)
8. Medications list (desktop + mobile)
9. Appointments calendar (desktop)
10. Vitals tracking dashboard (desktop)
11. Smart shopping list (mobile)
12. Household duties (desktop)

### Low Priority (Week 3)
13. Provider directory (desktop)
14. Kitchen inventory (desktop)
15. Settings pages (desktop)
16. Mobile navigation (mobile)

## 📤 How to Add Screenshots

1. **Capture screenshot** following guidelines above
2. **Optimize image** to reduce file size
3. **Name correctly** using naming convention
4. **Save to appropriate folder** in this directory
5. **Test display** - View on website to verify
6. **Update documentation** if adding new screenshot category

## 🔗 Usage in Code

```tsx
import { Screenshot } from '@/components/ui/Screenshot'

// Basic usage
<Screenshot
  src="/screenshots/dashboard/overview-desktop-light.png"
  alt="WPL dashboard showing health metrics"
  caption="Your family's health at a glance"
/>

// Mobile with frame
import { MobileFrame } from '@/components/ui/Screenshot'

<MobileFrame variant="ios">
  <Screenshot
    src="/screenshots/meal-tracking/photo-upload-mobile-light.png"
    alt="Mobile meal logging"
    variant="mobile"
  />
</MobileFrame>

// Comparison slider
import { ScreenshotComparison } from '@/components/ui/Screenshot'

<ScreenshotComparison
  beforeSrc="/screenshots/dashboard/before.png"
  afterSrc="/screenshots/dashboard/after.png"
  alt="Dashboard improvement"
/>

// Gallery
import { ScreenshotGallery } from '@/components/ui/Screenshot'

<ScreenshotGallery
  screenshots={[
    { src: '/screenshots/dashboard/overview.png', alt: 'Dashboard', caption: 'Main view' },
    { src: '/screenshots/meals/tracking.png', alt: 'Meals', caption: 'Meal tracking' },
    { src: '/screenshots/weight/chart.png', alt: 'Weight', caption: 'Progress chart' }
  ]}
/>
```

## 📊 Screenshot Inventory

Keep track of what's been added:

| Feature | Desktop Light | Desktop Dark | Mobile Light | Mobile Dark | Status |
|---------|--------------|--------------|--------------|-------------|--------|
| Dashboard | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Meal Tracking | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Weight Tracking | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| AI Health Reports | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Family Care | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Patient Care | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Medical Docs | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Medications | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Appointments | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Vitals | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Shopping | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| Duties | ⬜ | ⬜ | ⬜ | ⬜ | Pending |

Update this table as you add screenshots (change ⬜ to ✅)

## 🆘 Need Help?

If you have questions about:
- What angle to capture
- How to create demo data
- Image optimization
- Best practices

Just ask! I'll provide specific guidance for each screenshot.

---

**Ready to receive screenshots! Drop them in the appropriate folders and I'll integrate them into the marketing site.** 🚀
