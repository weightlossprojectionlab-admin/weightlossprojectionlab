/**
 * Script to generate remaining landing pages
 * Run with: node scripts/generate-landing-pages.js
 */

const fs = require('fs');
const path = require('path');

const landingPages = [
  // Lifestyle/Demographics (remaining)
  {
    file: 'seniors-weight-loss.html',
    icon: '👴',
    title: 'Weight Loss for Seniors 60+',
    subtitle: 'Safe, gentle weight loss for active aging. Track meals in 30 seconds—no complicated tech required.',
    meta: {
      description: 'Safe weight loss for seniors and older adults. Easy meal tracking with large buttons and simple interface. Track in 30 seconds.',
      keywords: 'senior weight loss, elderly diet, aging, osteoporosis, senior fitness, healthy aging'
    },
    benefits: [
      {icon: '📱', title: 'Large, Easy-to-Read Interface', desc: 'Big buttons and text designed for senior-friendly use.'},
      {icon: '💪', title: 'Preserve Muscle Mass', desc: 'Protein-focused goals to maintain strength while losing weight.'},
      {icon: '🦴', title: 'Bone Health Support', desc: 'Track calcium and vitamin D for osteoporosis prevention.'},
      {icon: '👨‍⚕️', title: 'Medication Tracking', desc: 'Monitor all prescriptions alongside your diet and weight.'}
    ],
    features: [
      {icon: '⚡', title: 'Senior-Friendly Design', desc: 'Large text, simple navigation.'},
      {icon: '🎯', title: 'Safe Weight Goals', desc: 'Gradual, healthy targets.'},
      {icon: '📊', title: 'Health Monitoring', desc: 'Track BP, glucose, weight.'},
      {icon: '💊', title: 'Medication Logs', desc: 'All prescriptions in one place.'},
      {icon: '👨‍👩‍👧', title: 'Family Sharing', desc: 'Let family help monitor.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Your data protected.'}
    ],
    stats: [{number: '1k+', label: 'Seniors 60+'}, {number: '15lbs', label: 'Avg. Weight Lost'}, {number: '90%', label: 'Feel Stronger'}]
  },
  {
    file: 'college-students-weight-loss.html',
    icon: '🎓',
    title: 'Weight Loss for College Students',
    subtitle: 'Beat the freshman 15. Track dining hall meals in 30 seconds. Budget-friendly, dorm-room compatible.',
    meta: {
      description: 'Student-friendly weight loss. Track cafeteria and fast food in 30 seconds. Works with college budgets and schedules.',
      keywords: 'college weight loss, freshman 15, student diet, dorm food, campus life, budget meals'
    },
    benefits: [
      {icon: '🍕', title: 'Works with Cafeteria Food', desc: 'Track dining hall buffets and late-night pizza easily.'},
      {icon: '💰', title: 'Budget-Friendly', desc: 'Free app—no expensive meal plans or supplements required.'},
      {icon: '📚', title: 'Fits Your Schedule', desc: 'Track between classes, before exams, or during all-nighters.'},
      {icon: '🏃', title: 'Student Life Balance', desc: 'Realistic goals that work with parties and social life.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Faster than scrolling TikTok.'},
      {icon: '🎯', title: 'Student-Realistic Goals', desc: 'Works with dorm life.'},
      {icon: '📱', title: 'Campus WiFi Ready', desc: 'Offline mode available.'},
      {icon: '💪', title: 'Gym Integration', desc: 'Track rec center workouts.'},
      {icon: '🍻', title: 'Party Mode', desc: 'Track social eating honestly.'},
      {icon: '🔒', title: 'Private', desc: 'No social comparison.'}
    ],
    stats: [{number: '2k+', label: 'Students'}, {number: 'Freshman 15', label: 'Beat It'}, {number: '85%', label: 'More Confident'}]
  },
  {
    file: 'shift-workers-weight-loss.html',
    icon: '🌙',
    title: 'Weight Loss for Shift Workers',
    subtitle: 'Lose weight despite night shifts and irregular schedules. Track meals anytime—works 24/7 like you do.',
    meta: {
      description: 'Weight loss for night shift and rotating schedules. Track meals 24/7. Goals adjusted for disrupted sleep.',
      keywords: 'night shift weight loss, shift worker, irregular schedule, 24/7, rotating shifts, graveyard shift'
    },
    benefits: [
      {icon: '🌙', title: 'Works Around the Clock', desc: 'Track 3am meals or midnight snacks—no judgment, just data.'},
      {icon: '😴', title: 'Accounts for Sleep Disruption', desc: 'Calorie goals adjusted for metabolic changes from shift work.'},
      {icon: '⚡', title: 'Energy Level Tracking', desc: 'Monitor how food affects alertness during different shifts.'},
      {icon: '☕', title: 'Caffeine Monitoring', desc: 'Track coffee intake and see how it affects weight and sleep.'}
    ],
    features: [
      {icon: '⚡', title: '24/7 Tracking', desc: 'Anytime, anywhere.'},
      {icon: '🎯', title: 'Shift-Aware Goals', desc: 'Adjusted for your schedule.'},
      {icon: '😴', title: 'Sleep Quality Log', desc: 'Track rest and recovery.'},
      {icon: '☕', title: 'Caffeine Tracker', desc: 'Monitor stimulant intake.'},
      {icon: '💪', title: 'Energy Levels', desc: 'See what fuels you.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Your data protected.'}
    ],
    stats: [{number: '1k+', label: 'Shift Workers'}, {number: '18lbs', label: 'Avg. Weight Lost'}, {number: '75%', label: 'Better Energy'}]
  },
  {
    file: 'traveling-professionals-weight-loss.html',
    icon: '✈️',
    title: 'Weight Loss for Frequent Travelers',
    subtitle: 'Lose weight on the road. Track airport food and hotel meals in 30 seconds. Works across time zones.',
    meta: {
      description: 'Weight loss for business travelers. Track meals on planes, in hotels, at conferences. Works offline.',
      keywords: 'travel weight loss, business travel, frequent flyer, hotel food, airport meals, road warrior'
    },
    benefits: [
      {icon: '✈️', title: 'Track Airport & Hotel Food', desc: 'Log meals from any restaurant, any city, any country.'},
      {icon: '📱', title: 'Works Offline', desc: 'No WiFi needed—syncs when you reconnect.'},
      {icon: '🌎', title: 'Multi-Timezone Support', desc: 'Automatic adjustment for jet lag and time zone changes.'},
      {icon: '🏨', title: 'Conference-Friendly', desc: 'Quick tracking during networking events and buffets.'}
    ],
    features: [
      {icon: '⚡', title: 'Offline Mode', desc: 'No internet required.'},
      {icon: '🎯', title: 'Travel-Adjusted Goals', desc: 'Realistic for road life.'},
      {icon: '🌎', title: 'Timezone Aware', desc: 'Auto-adjusts for jet lag.'},
      {icon: '🏨', title: 'Hotel Gym Tracking', desc: 'Log workouts anywhere.'},
      {icon: '📊', title: 'Trip Reports', desc: 'See travel impact on weight.'},
      {icon: '🔒', title: 'Encrypted Sync', desc: 'Secure across devices.'}
    ],
    stats: [{number: '800+', label: 'Road Warriors'}, {number: '12lbs', label: 'Avg. Weight Lost'}, {number: '90%', label: 'Stay on Track'}]
  },
  // Diet Preferences
  {
    file: 'vegetarian-weight-loss.html',
    icon: '🌱',
    title: 'Vegetarian Weight Loss Tracking',
    subtitle: 'Plant-based weight loss made simple. Track vegetarian meals in 30 seconds. Get balanced nutrition insights.',
    meta: {
      description: 'Vegetarian meal tracking and weight loss. AI recognizes plant-based foods. Track protein, iron, B12 automatically.',
      keywords: 'vegetarian weight loss, plant-based diet, meatless, veggie, lacto-ovo vegetarian'
    },
    benefits: [
      {icon: '🥗', title: 'Recognizes Plant-Based Foods', desc: 'AI trained on vegetarian cuisine from around the world.'},
      {icon: '💪', title: 'Protein Tracking', desc: 'Ensure adequate plant protein for muscle maintenance during weight loss.'},
      {icon: '🥬', title: 'Nutrient Monitoring', desc: 'Track iron, B12, calcium, and other key vegetarian nutrients.'},
      {icon: '📊', title: 'Balanced Macro Goals', desc: 'Carb, protein, fat targets optimized for vegetarian eating.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Photo-based logging.'},
      {icon: '🎯', title: 'Veggie-Optimized Goals', desc: 'Plant-based targets.'},
      {icon: '💪', title: 'Protein Insights', desc: 'Hit protein goals easily.'},
      {icon: '🥬', title: 'Nutrient Tracking', desc: 'Iron, B12, calcium.'},
      {icon: '🌎', title: 'Global Cuisine', desc: 'Recognizes world foods.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Your data protected.'}
    ],
    stats: [{number: '2k+', label: 'Vegetarians'}, {number: '18lbs', label: 'Avg. Weight Lost'}, {number: '90%', label: 'Hit Protein Goals'}]
  },
  {
    file: 'vegan-weight-loss.html',
    icon: '🥑',
    title: 'Vegan Weight Loss Tracking',
    subtitle: '100% plant-based weight loss. Track vegan meals in 30 seconds. Ensure complete nutrition on a vegan diet.',
    meta: {
      description: 'Vegan meal tracking for weight loss. AI recognizes plant-based foods. Track B12, protein, omega-3s automatically.',
      keywords: 'vegan weight loss, plant-based, WFPB, whole food plant-based, vegan diet'
    },
    benefits: [
      {icon: '🌱', title: 'Vegan Food Database', desc: 'AI trained on extensive vegan and plant-based cuisine.'},
      {icon: '💊', title: 'B12 & Supplement Tracking', desc: 'Monitor essential vegan supplements alongside meals.'},
      {icon: '💪', title: 'Complete Protein Combos', desc: 'Learn which plant foods provide all essential amino acids.'},
      {icon: '🥜', title: 'Omega-3 Monitoring', desc: 'Track ALA sources like flax, chia, and walnuts.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Quick photo logging.'},
      {icon: '🎯', title: 'Vegan-Optimized', desc: 'Plant-exclusive goals.'},
      {icon: '💪', title: 'Protein Tracker', desc: 'Complete amino acids.'},
      {icon: '💊', title: 'Supplement Log', desc: 'B12, D, omega-3.'},
      {icon: '🌎', title: 'Global Vegan Foods', desc: 'Worldwide recognition.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Your data safe.'}
    ],
    stats: [{number: '1.5k+', label: 'Vegans'}, {number: '20lbs', label: 'Avg. Weight Lost'}, {number: '95%', label: 'Complete Nutrition'}]
  },
  {
    file: 'keto-weight-loss-tracking.html',
    icon: '🥓',
    title: 'Keto Macro Tracking Made Easy',
    subtitle: 'Stay in ketosis effortlessly. Track net carbs in 30 seconds. Hit your keto macros without the math.',
    meta: {
      description: 'Keto diet tracking. AI calculates net carbs automatically. Track fat, protein, carbs for ketosis.',
      keywords: 'keto tracking, ketogenic diet, low carb, net carbs, macros, ketosis'
    },
    benefits: [
      {icon: '🥓', title: 'Auto Net Carb Calculation', desc: 'Fiber automatically subtracted—accurate net carbs every time.'},
      {icon: '📊', title: 'Macro Pie Chart', desc: 'Visual breakdown of fat/protein/carb ratios for each meal.'},
      {icon: '🎯', title: 'Ketosis-Optimized Goals', desc: 'Standard keto macros: 70% fat, 25% protein, 5% carbs.'},
      {icon: '💪', title: 'Protein Tracking', desc: 'Ensure adequate protein to preserve muscle on keto.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Photo-based logging.'},
      {icon: '🎯', title: 'Keto Macro Targets', desc: '70/25/5 ratio.'},
      {icon: '🥓', title: 'Net Carb Auto-Calc', desc: 'Fiber subtracted.'},
      {icon: '📊', title: 'Macro Charts', desc: 'Visual breakdowns.'},
      {icon: '💧', title: 'Ketone Tracking', desc: 'Log blood/urine ketones.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Your data protected.'}
    ],
    stats: [{number: '3k+', label: 'Keto Dieters'}, {number: '25lbs', label: 'Avg. Weight Lost'}, {number: '90%', label: 'Stay in Ketosis'}]
  },
  {
    file: 'low-carb-weight-loss.html',
    icon: '🍞',
    title: 'Low-Carb Weight Loss Tracking',
    subtitle: 'Cut carbs, not flavor. Track low-carb meals in 30 seconds. Simple carb counting that works.',
    meta: {
      description: 'Low-carb diet tracking. AI counts carbs automatically. Perfect for Atkins, South Beach, or custom low-carb plans.',
      keywords: 'low carb tracking, carb counting, Atkins, South Beach, carb restriction'
    },
    benefits: [
      {icon: '🍞', title: 'Automatic Carb Counting', desc: 'Snap a photo—carbs calculated instantly with no manual entry.'},
      {icon: '📊', title: 'Daily Carb Limits', desc: 'Set your target (50g, 100g, 150g) and stay on track effortlessly.'},
      {icon: '💪', title: 'High-Protein Support', desc: 'Track protein to maintain muscle while restricting carbs.'},
      {icon: '🥗', title: 'Fiber Insights', desc: 'See total vs. net carbs for more flexible low-carb eating.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Quick photo logging.'},
      {icon: '🎯', title: 'Custom Carb Limits', desc: 'Set your own target.'},
      {icon: '🍞', title: 'Carb Counter', desc: 'Auto-calculated.'},
      {icon: '💪', title: 'Protein Goals', desc: 'Muscle preservation.'},
      {icon: '📊', title: 'Net vs Total Carbs', desc: 'Flexible tracking.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Data protected.'}
    ],
    stats: [{number: '4k+', label: 'Low-Carb Users'}, {number: '22lbs', label: 'Avg. Weight Lost'}, {number: '88%', label: 'Hit Carb Goals'}]
  },
  {
    file: 'mediterranean-diet-weight-loss.html',
    icon: '🫒',
    title: 'Mediterranean Diet Weight Loss',
    subtitle: 'Heart-healthy Mediterranean eating for weight loss. Track olive oil, fish, and whole grains in 30 seconds.',
    meta: {
      description: 'Mediterranean diet tracking. AI recognizes Med diet foods. Track healthy fats, fish, whole grains for weight loss.',
      keywords: 'Mediterranean diet, Med diet, olive oil, heart healthy, longevity diet'
    },
    benefits: [
      {icon: '🫒', title: 'Mediterranean Food Recognition', desc: 'AI trained on Greek, Italian, Spanish, and Middle Eastern cuisine.'},
      {icon: '❤️', title: 'Heart-Healthy Fat Tracking', desc: 'Monitor olive oil, nuts, and avocado—good fats for weight loss.'},
      {icon: '🐟', title: 'Omega-3 from Fish', desc: 'Track salmon, sardines, and other Mediterranean seafood.'},
      {icon: '🍇', title: 'Whole Food Focus', desc: 'Emphasis on fruits, vegetables, whole grains, and legumes.'}
    },
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Photo-based logging.'},
      {icon: '🎯', title: 'Med Diet Goals', desc: 'Heart-healthy targets.'},
      {icon: '🫒', title: 'Healthy Fat Tracker', desc: 'Olive oil, nuts, fish.'},
      {icon: '🐟', title: 'Omega-3 Monitor', desc: 'Track fish intake.'},
      {icon: '🍇', title: 'Whole Food Focus', desc: 'Plant-forward eating.'},
      {icon: '🔒', title: 'Private & Secure', desc: 'Data protected.'}
    ],
    stats: [{number: '2k+', label: 'Med Diet Followers'}, {number: '18lbs', label: 'Avg. Weight Lost'}, {number: '92%', label: 'Improve Heart Health'}]
  },
  // Goals/Pain Points
  {
    file: 'quick-meal-logging.html',
    icon: '⚡',
    title: 'I Hate Tracking Food - Try This Instead',
    subtitle: 'If you hate logging meals, you\'ll love this. Just snap a photo—done in 30 seconds. No typing, no searching.',
    meta: {
      description: 'Fastest meal tracking ever. Snap a photo, done in 30 seconds. For people who hate traditional food logging.',
      keywords: 'hate tracking food, easy meal logging, photo-based, quick tracking, simple diet app'
    },
    benefits: [
      {icon: '📸', title: 'Just Take a Photo', desc: 'That\'s it. No typing food names, no searching databases, no manual entry.'},
      {icon: '⚡', title: 'Literally 30 Seconds', desc: 'Faster than texting. Faster than Instagram. Faster than everything else you do on your phone.'},
      {icon: '🧠', title: 'AI Does All the Work', desc: 'Identifies food, counts calories, calculates macros—while you do nothing.'},
      {icon: '😌', title: 'Zero Frustration', desc: 'No tedious logging, no math, no overthinking. Just results.'}
    ],
    features: [
      {icon: '⚡', title: 'Photo = Done', desc: 'Fastest tracking ever.'},
      {icon: '🎯', title: 'Auto Everything', desc: 'AI calculates it all.'},
      {icon: '📱', title: 'One-Tap Logging', desc: 'Camera, snap, done.'},
      {icon: '💪', title: 'See Results', desc: 'Weight drops anyway.'},
      {icon: '🚫', title: 'No Manual Entry', desc: 'Zero typing required.'},
      {icon: '🔒', title: 'Private', desc: 'Just for you.'}
    ],
    stats: [{number: '30sec', label: 'Per Meal'}, {number: '10min', label: 'Saved Daily'}, {number: '95%', label: 'Actually Stick With It'}]
  },
  {
    file: 'no-counting-calories-weight-loss.html',
    icon: '🚫',
    title: 'Weight Loss Without Counting Calories',
    subtitle: 'Lose weight without obsessing over numbers. Visual portion tracking—no math required.',
    meta: {
      description: 'Lose weight without calorie counting. Photo-based portion control. No math, no numbers, just results.',
      keywords: 'no calorie counting, intuitive eating, portion control, visual tracking, simple weight loss'
    },
    benefits: [
      {icon: '📸', title: 'Visual Portion Learning', desc: 'See what healthy portions look like—no scales or measuring cups needed.'},
      {icon: '🎯', title: 'Color-Coded Feedback', desc: 'Green for on-track, yellow for caution, red for over. Simple traffic light system.'},
      {icon: '😌', title: 'Stress-Free Approach', desc: 'No obsessing over every calorie. Just mindful, visual awareness.'},
      {icon: '📊', title: 'Weight Trends, Not Numbers', desc: 'Focus on the scale going down, not hitting exact calorie targets.'}
    ],
    features: [
      {icon: '⚡', title: 'Photo-Based', desc: 'No number crunching.'},
      {icon: '🎯', title: 'Visual Feedback', desc: 'Traffic light system.'},
      {icon: '📸', title: 'Portion Learning', desc: 'See what works.'},
      {icon: '💪', title: 'Weight Focus', desc: 'Results over numbers.'},
      {icon: '😌', title: 'Stress-Free', desc: 'No obsessing.'},
      {icon: '🔒', title: 'Private', desc: 'Your journey.'}
    ],
    stats: [{number: '5k+', label: 'Number-Free Users'}, {number: '19lbs', label: 'Avg. Weight Lost'}, {number: '89%', label: 'Less Stress'}]
  },
  {
    file: 'visual-weight-loss-tracking.html',
    icon: '📊',
    title: 'Visual Weight Loss Progress Tracking',
    subtitle: 'See your progress, don\'t just read about it. Photo timelines, weight charts, and visual meal galleries.',
    meta: {
      description: 'Visual weight loss tracking. Photo progress timelines. Charts and graphs that motivate. See your transformation.',
      keywords: 'visual tracking, progress photos, weight charts, transformation, before after'
    },
    benefits: [
      {icon: '📸', title: 'Photo Timeline', desc: 'See your body transformation in a scrollable before-and-after timeline.'},
      {icon: '📊', title: 'Weight Trend Charts', desc: 'Visual graphs show progress even when the scale fluctuates.'},
      {icon: '🍽️', title: 'Meal Photo Gallery', desc: 'Browse your healthy eating journey—motivating visual proof.'},
      {icon: '🎯', title: 'Milestone Celebrations', desc: 'Visual badges and achievements for every 5 pounds lost.'}
    ],
    features: [
      {icon: '⚡', title: '30-Second Logging', desc: 'Quick photo tracking.'},
      {icon: '📸', title: 'Progress Timeline', desc: 'Before/after photos.'},
      {icon: '📊', title: 'Weight Charts', desc: 'Trend visualization.'},
      {icon: '🍽️', title: 'Meal Gallery', desc: 'Your food journey.'},
      {icon: '🏆', title: 'Visual Milestones', desc: 'Achievement badges.'},
      {icon: '🔒', title: 'Private Gallery', desc: 'Only you see it.'}
    ],
    stats: [{number: '6k+', label: 'Visual Learners'}, {number: '23lbs', label: 'Avg. Weight Lost'}, {number: '93%', label: 'Stay Motivated'}]
  },
  {
    file: 'family-meal-planning-weight-loss.html',
    icon: '👨‍👩‍👧‍👦',
    title: 'Family Meal Planning + Weight Loss',
    subtitle: 'Cook for your family AND lose weight. Track family dinners in 30 seconds. Everyone eats, you still lose.',
    meta: {
      description: 'Weight loss while feeding a family. Track family meals easily. One dinner, different portions, everyone happy.',
      keywords: 'family meals, meal planning, cooking for family, family dinner, busy parent weight loss'
    },
    benefits: [
      {icon: '🍽️', title: 'One Meal, Multiple Portions', desc: 'Track your smaller portion of the same family dinner. No separate meals needed.'},
      {icon: '👨‍👩‍👧‍👦', title: 'Family Sharing', desc: 'Share meal plans with spouse. Coordinate who\'s cooking and tracking.'},
      {icon: '📸', title: 'Track Once for Everyone', desc: 'Log the family meal photo, adjust portions for each person.'},
      {icon: '🥗', title: 'Add Your Salad', desc: 'Family eats pasta, you add a side salad—track both easily.'}
    },
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Quick family logging.'},
      {icon: '🎯', title: 'Portion Control', desc: 'Your size, not theirs.'},
      {icon: '👨‍👩‍👧‍👦', title: 'Family Sharing', desc: 'Coordinate meals.'},
      {icon: '📸', title: 'One Photo, Many Portions', desc: 'Track the table.'},
      {icon: '🥗', title: 'Flexible Additions', desc: 'Your extras tracked.'},
      {icon: '🔒', title: 'Private', desc: 'Your progress, your data.'}
    ],
    stats: [{number: '4k+', label: 'Family Cooks'}, {number: '17lbs', label: 'Avg. Weight Lost'}, {number: '91%', label: 'Keep Cooking'}]
  },
  {
    file: 'medication-management-weight-loss.html',
    icon: '💊',
    title: 'Weight Loss with Medication Management',
    subtitle: 'Track meds and meals together. See how weight loss affects your prescriptions. Share reports with doctors.',
    meta: {
      description: 'Weight loss with medication tracking. Monitor how diet affects meds. Share comprehensive health reports with doctors.',
      keywords: 'medication tracking, prescription management, weight loss meds, health tracking, doctor reports'
    },
    benefits: [
      {icon: '💊', title: 'All Meds in One Place', desc: 'Track prescriptions, supplements, vitamins alongside your meals and weight.'},
      {icon: '📊', title: 'See Med-Weight Connection', desc: 'Visualize how weight loss may reduce medication needs over time.'},
      {icon: '👨‍⚕️', title: 'Doctor-Ready Reports', desc: 'Generate comprehensive reports showing meals, meds, and weight for appointments.'},
      {icon: '⏰', title: 'Medication Reminders', desc: 'Never forget a dose—get reminders synced with your meal times.'}
    },
    features: [
      {icon: '⚡', title: '30-Second Tracking', desc: 'Meals and meds.'},
      {icon: '💊', title: 'Full Med Library', desc: 'All prescriptions tracked.'},
      {icon: '📊', title: 'Health Reports', desc: 'Doctor-ready summaries.'},
      {icon: '⏰', title: 'Med Reminders', desc: 'Never miss a dose.'},
      {icon: '🔗', title: 'Meal-Med Timing', desc: 'Track with food.'},
      {icon: '🔒', title: 'HIPAA Compliant', desc: 'Medical-grade security.'}
    ],
    stats: [{number: '3k+', label: 'Med Managers'}, {number: '20lbs', label: 'Avg. Weight Lost'}, {number: '65%', label: 'Reduce Meds'}]
  }
];

const template = (page) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} | WPL</title>
  <meta name="description" content="${page.meta.description}">
  <meta name="keywords" content="${page.meta.keywords}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/landing/assets/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="hero-icon">${page.icon}</div>
      <h1>${page.title}</h1>
      <p class="subtitle">${page.subtitle}</p>
      <a href="/auth" class="cta-button">Start Your Journey Free 🚀</a>
      <p style="margin-top: 16px; font-size: 0.875rem; opacity: 0.9;">No credit card required • Join 10,000+ users</p>
    </header>

    <div class="content">
      <section class="section">
        <h2 class="section-title">Why WPL Works for You</h2>
        <div class="benefits-list">
          ${page.benefits.map(b => `<div class="benefit-item"><div class="benefit-icon">${b.icon}</div><div class="benefit-text"><h3>${b.title}</h3><p>${b.desc}</p></div></div>`).join('\n          ')}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Everything You Need</h2>
        <div class="feature-grid">
          ${page.features.map(f => `<div class="feature-card"><div class="feature-icon">${f.icon}</div><h3 class="feature-title">${f.title}</h3><p class="feature-desc">${f.desc}</p></div>`).join('\n          ')}
        </div>
      </section>

      <div class="stats">
        <div class="stats-grid">
          ${page.stats.map(s => `<div><span class="stat-number">${s.number}</span><span class="stat-label">${s.label}</span></div>`).join('\n          ')}
        </div>
      </div>

      <div class="footer-cta">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands achieving their weight loss goals with WPL.</p>
        <a href="/auth" class="cta-button">Start Free Today 🚀</a>
        <div class="trust-badges">
          <div class="badge"><span class="badge-icon">📱</span><span>Mobile-First</span></div>
          <div class="badge"><span class="badge-icon">🔒</span><span>Privacy-Focused</span></div>
          <div class="badge"><span class="badge-icon">♿</span><span>Accessible</span></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Generate all pages
const outputDir = path.join(__dirname, '..', 'public', 'landing');

landingPages.forEach(page => {
  const filePath = path.join(outputDir, page.file);
  const content = template(page);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Created ${page.file}`);
});

console.log(`\n✅ Generated ${landingPages.length} landing pages successfully!`);
