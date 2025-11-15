# Social Media Cards Feature Guide

## Overview
The Photo Gallery now includes a powerful Social Media Post Creator that generates platform-optimized cards for sharing your meals on social media.

## How to Use

### 1. Navigate to Gallery
- Go to the Photo Gallery page (`/gallery`)
- You'll see your meal photos in the default view

### 2. Enable Social Share Mode
- Click the **"📸 Share"** button in the view mode toggle (top right controls)
- This switches the gallery to Social Share mode
- You'll see an info banner explaining the feature

### 3. Generate Platform-Specific Cards
- **Hover** over any meal photo
- A platform selector overlay appears with 6 options:
  - **Instagram Story** (9:16 vertical - 1080x1920)
  - **Instagram Post** (1:1 square - 1080x1080)
  - **TikTok** (9:16 vertical - 1080x1920)
  - **Facebook** (1.91:1 landscape - 1200x630)
  - **Pinterest** (2:3 tall - 1000x1500)
  - **Twitter/X** (16:9 landscape - 1200x675)

### 4. Download Your Card
- Click your desired platform
- The card generates automatically (you'll see a spinner)
- The image downloads as a PNG file with format: `YYYY-MM-DD_mealtype_platform.png`
- Example: `2025-11-14_dinner_instagram_story.png`

### 5. Share on Social Media
- Upload the downloaded image to your chosen platform
- The card includes:
  - Your meal photo (top portion, professionally formatted)
  - Meal information (calories, meal type)
  - Macros (if available)
  - Professional branding footer

## Platform-Specific Details

### Instagram Story/Reel
- **Dimensions**: 1080x1920 (9:16)
- **Best for**: Instagram Stories, Reels
- **Photo coverage**: 65% of card
- **Perfect vertical format for mobile viewing**

### Instagram Post
- **Dimensions**: 1080x1080 (1:1)
- **Best for**: Instagram feed posts
- **Photo coverage**: 50% of card
- **Classic square format**

### TikTok
- **Dimensions**: 1080x1920 (9:16)
- **Best for**: TikTok posts
- **Photo coverage**: 65% of card
- **Optimized for short-form video platform**

### Facebook
- **Dimensions**: 1200x630 (1.91:1)
- **Best for**: Facebook posts, link previews
- **Photo coverage**: 60% of card
- **Landscape format for desktop and mobile**

### Pinterest
- **Dimensions**: 1000x1500 (2:3)
- **Best for**: Pinterest pins
- **Photo coverage**: 60% of card
- **Tall format optimized for Pinterest discovery**

### Twitter/X
- **Dimensions**: 1200x675 (16:9)
- **Best for**: Tweets with images
- **Photo coverage**: 60% of card
- **Widescreen format for timeline**

## Card Features

### Visual Elements
- **Gradient Background**: Purple to indigo gradient
- **Meal Photo**: Professionally cropped and centered
- **White Content Card**: Rounded corners with shadow
- **Emoji Indicators**: Meal type emojis (🌅 breakfast, ☀️ lunch, 🌙 dinner, 🍎 snack)

### Data Displayed
- Meal type and emoji
- Title (if available)
- Total calories (large, prominent)
- Macros breakdown (protein, carbs, fat)
- Branding footer: "Tracked with Weight Loss Project Lab"

### Responsive Design
- Font sizes scale based on canvas dimensions
- Layout adapts to different aspect ratios
- Consistent visual hierarchy across all platforms

## Platform-Specific Captions

Each platform has optimized caption generation (available via `lib/share-utils.ts`):

### Instagram
```
🍽️ Grilled Chicken Salad 💪
📊 450 cal | P35g C28g F18g
📅 Nov 14

🥗 Grilled chicken, mixed greens, cherry tomatoes...

#HealthyEating #NutritionTracking #FitnessJourney #HealthGoals #Macros #CalorieCounting
```

### TikTok
```
Grilled Chicken Salad 🔥
450 cals 💯
P35 C28 F18 ✨

#FoodTok #HealthyFood #CalorieDeficit #MacroTracking #FitnessJourney
```

### Facebook
```
Just logged my dinner: Grilled Chicken Salad! 🍽️

Nutritional breakdown:
• Calories: 450
• Protein: 35g
• Carbs: 28g
• Fat: 18g

Tracking my nutrition journey with Weight Loss Project Lab! 💪
```

### Pinterest
```
Grilled Chicken Salad - 450 Calories

Healthy dinner idea with 35g protein, 28g carbs, 18g fat.
Perfect for your weight loss journey!

#HealthyRecipes #MealIdeas #WeightLoss #NutritionTips
```

### Twitter
```
Grilled Chicken Salad 🍽️
450 cal | P35 C28 F18

#HealthyEating #Nutrition #FitnessJourney
```

## Technical Implementation

### Files Created
- `lib/social-media-cards.ts` - Platform card generators
- `components/gallery/PlatformSelector.tsx` - Overlay component
- Enhanced `components/gallery/PhotoGalleryGrid.tsx` - Integration
- Enhanced `app/gallery/page.tsx` - View mode toggle

### Technologies Used
- **Canvas API**: For image generation
- **HTML5 Canvas**: Drawing meal cards
- **Blob API**: Creating downloadable images
- **TypeScript**: Full type safety
- **React**: Component-based UI

## Future Enhancements (Optional)

Potential features to add:
1. **Caption Preview**: Show platform-specific caption before download
2. **Custom Branding**: Allow users to customize footer text
3. **Color Themes**: Multiple gradient options
4. **Social Media Integration**: Direct posting via APIs
5. **Batch Download**: Generate all platform cards at once
6. **Custom Fonts**: Web fonts for enhanced typography

## Tips for Best Results

1. **Use High-Quality Photos**: Original meal photos should be clear and well-lit
2. **Complete AI Analysis**: Meals with full AI analysis data look best
3. **Try Different Platforms**: Each platform format highlights meals differently
4. **Vertical Photos**: Work best for Instagram Story and TikTok formats
5. **Landscape Photos**: Better suited for Facebook and Twitter formats

## Troubleshooting

### Card Not Downloading
- Check browser permissions for downloads
- Ensure popup blockers aren't interfering
- Try a different browser

### Image Quality Issues
- Original photo quality affects final card
- Ensure photos are at least 1080px wide
- Use good lighting when taking meal photos

### Missing Data
- Some meals may not have complete nutritional info
- Cards still generate with available data
- Manual entries may have limited information

## Support

For issues or feature requests, please check:
- Console logs for error messages
- Browser developer tools for debugging
- Firebase storage permissions for photo access
