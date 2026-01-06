# User Communication Templates for Monetization Launch

## Timeline Overview

| Day | Communication Type | Audience | Purpose |
|-----|-------------------|----------|---------|
| **Day -7** | Email Announcement | 20 existing users | Inform about grandfathering |
| **Day -3** | Follow-up Email | Users who didn't open | Reminder + reassurance |
| **Day 0** | In-App Banner | Grandfathered users | Thank you message |
| **Day 0** | Trial Modal | New signups | Explain 30-day trial |
| **Day 27-30** | Trial Expiring Banner | Trial users | Upgrade prompt |

---

## Email Template 1: Grandfathering Announcement (Day -7)

**Subject:** 🌟 You're a Founding Member - Thank You!

**Preview Text:** Your free lifetime access as an early supporter

**Body:**

```
Hi [First Name],

You're one of the first 20 people to trust us with your weight loss journey,
and we couldn't be more grateful.

As we prepare to officially launch and bring WPL to more people, we wanted
to give you a personal heads-up about what's changing—and what's NOT changing
for you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ YOUR ACCESS NEVER CHANGES

You'll keep full access to everything you're using now, completely free,
forever. No payment required. No catch.

Here's what you get as a Founding Member:

  • Single User plan features (normally $9.99/mo)
  • Lifetime "Founding Member" badge
  • Priority support (24-hour response time)
  • Early access to new features
  • Our eternal gratitude 🙏

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 WHAT'S HAPPENING

Starting [Launch Date], new users will see our pricing plans when they sign up.
But you? You're grandfathered in. Your account won't change, and you'll never
see a paywall.

This is our way of saying thank you for believing in us when we were just
getting started.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ QUESTIONS? WE'RE HERE

  • Will I lose any features? NO. Everything stays the same.
  • Will I ever be charged? NO. Never.
  • Can I upgrade if I want? YES. You'll get a special discount.
  • What if I want to add family members? You'll get 50% off any plan upgrade.

Reply to this email with any questions. We read every reply personally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

With deep gratitude,

[Your Name]
Founder, WPL

P.S. If you know anyone who might benefit from WPL, we'd love an introduction.
As a thank you, we'll give your friend their first month free when you refer them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View Your Founding Member Benefits] [Read the FAQ] [Refer a Friend]
```

---

## Email Template 2: Follow-Up Reminder (Day -3)

**Subject:** Quick reminder: You're all set (no action needed)

**Preview Text:** Your lifetime free access is confirmed

**Body:**

```
Hi [First Name],

Just a quick follow-up to our email last week.

I wanted to make absolutely sure you saw this:

✅ Your access is FREE FOREVER
✅ Nothing changes on your end
✅ You're grandfathered as a Founding Member

When we launch pricing on [Launch Date], you won't see any changes.
Your account will work exactly like it always has.

No action needed from you. Just wanted you to know you're all set.

Thanks for being an early supporter,

[Your Name]
Founder, WPL

P.S. Have feedback on how we can improve? I'd love to hear it.
Just hit reply.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Questions? Reply to this email] [View Your Dashboard]
```

---

## In-App Banner Template: Grandfathered Users (Day 0+)

**Component:** Banner at top of dashboard

**Design:**

```tsx
<div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 mb-6 border-2 border-purple-300 dark:border-purple-700">
  <div className="flex items-center space-x-3">
    {/* Badge Icon */}
    <div className="flex-shrink-0">
      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
        🌟
      </div>
    </div>

    {/* Content */}
    <div className="flex-1">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
          You're a Founding Member
        </h3>
        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
          LIFETIME ACCESS
        </span>
      </div>
      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
        Thank you for being an early supporter. You have free access to all Single User features, forever.
      </p>
    </div>

    {/* CTA */}
    <div className="flex-shrink-0">
      <button
        onClick={() => setShowFoundingMemberModal(true)}
        className="btn btn-sm btn-secondary"
      >
        Learn More
      </button>
    </div>

    {/* Dismiss */}
    <button
      onClick={() => setShowBanner(false)}
      className="flex-shrink-0 text-purple-500 hover:text-purple-700"
      aria-label="Dismiss"
    >
      ✕
    </button>
  </div>
</div>
```

---

## Modal Template: New User Trial (Day 0)

**Component:** Modal shown immediately after signup

**Design:**

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
    {/* Header */}
    <div className="text-center mb-6">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-4">
        🎉
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Welcome to WPL!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Your 30-day free trial starts now
      </p>
    </div>

    {/* Features List */}
    <div className="space-y-3 mb-6">
      <div className="flex items-start space-x-3">
        <span className="text-green-500 text-xl">✓</span>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Unlimited meal logging</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track everything you eat with AI recognition</p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <span className="text-green-500 text-xl">✓</span>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">AI-powered recommendations</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Get personalized advice to reach your goals</p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <span className="text-green-500 text-xl">✓</span>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Weight tracking & analytics</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">See your progress with beautiful charts</p>
        </div>
      </div>
    </div>

    {/* Pricing Info */}
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
      <p className="text-sm text-center text-blue-900 dark:text-blue-100">
        After your trial: <span className="font-bold">$9.99/month</span>
      </p>
      <p className="text-xs text-center text-blue-700 dark:text-blue-300 mt-1">
        Cancel anytime • No payment required during trial
      </p>
    </div>

    {/* CTA */}
    <button
      onClick={() => setShowTrialModal(false)}
      className="btn btn-primary w-full"
    >
      Start Your Journey
    </button>

    <button
      onClick={() => router.push('/pricing')}
      className="btn btn-link w-full mt-2"
    >
      Browse All Plans
    </button>
  </div>
</div>
```

---

## Banner Template: Trial Expiring (Day 27-30)

**Component:** Sticky banner at top of dashboard

**Design (Days 27-29):**

```tsx
<div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <span className="text-2xl">⏰</span>
      <div>
        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
          Your trial ends in {daysLeft} days
        </p>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          You've logged {mealCount} meals and lost {weightLoss} lbs! Keep your progress going.
        </p>
      </div>
    </div>

    <div className="flex space-x-2">
      <button
        onClick={() => router.push('/pricing')}
        className="btn btn-primary"
      >
        Choose Plan
      </button>
      <button
        onClick={() => setReminderDismissed(true)}
        className="btn btn-link"
      >
        Remind Me Tomorrow
      </button>
    </div>
  </div>
</div>
```

**Design (Day 30 - Hard Gate):**

```tsx
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
  <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-8 shadow-2xl">
    {/* Can't dismiss this one */}

    <div className="text-center mb-6">
      <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-4">
        ⏰
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Your Trial Has Ended
      </h2>
    </div>

    {/* Progress Summary */}
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">
        Your Amazing Progress:
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-blue-600">{mealCount}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Meals Logged</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">{weightLoss}</p>
          <p className="text-sm text-green-700 dark:text-green-300">lbs Lost</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-purple-600">{daysActive}</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Days Active</p>
        </div>
      </div>
    </div>

    <p className="text-center text-gray-700 dark:text-gray-300 mb-6">
      You've built incredible momentum. Subscribe now to keep your streak going
      and reach your goal weight!
    </p>

    {/* Pricing Options */}
    <div className="space-y-3 mb-6">
      {/* Recommended Plan */}
      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 relative">
        <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          RECOMMENDED
        </span>
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Single User</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Perfect for individuals</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">$9.99</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">/month</p>
          </div>
        </div>
        <button
          onClick={() => handleCheckout('single')}
          className="btn btn-primary w-full mt-3"
        >
          Subscribe Now
        </button>
      </div>

      {/* Family Plan Option */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Family Basic</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track up to 4 family members</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">$19.99</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">/month</p>
          </div>
        </div>
        <button
          onClick={() => handleCheckout('family_basic')}
          className="btn btn-secondary w-full mt-3"
        >
          Subscribe
        </button>
      </div>
    </div>

    <button
      onClick={() => router.push('/pricing')}
      className="btn btn-link w-full"
    >
      Compare All Plans
    </button>

    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
      Cancel anytime • 30-day money-back guarantee
    </p>
  </div>
</div>
```

---

## FAQ Document (for website)

### Frequently Asked Questions: WPL Pricing

**Q: I'm an existing user. Will I be charged?**
A: No! If you created your account before [Launch Date], you're grandfathered in with permanent free access. You'll never be charged unless you choose to upgrade for additional features.

**Q: What's included in the free trial?**
A: New users get full access to all Single User plan features for 30 days, no credit card required for the first 14 days. This includes unlimited meal logging, weight tracking, AI recommendations, and more.

**Q: What happens when my trial ends?**
A: You'll receive reminders starting 3 days before your trial expires. If you don't subscribe, you'll still be able to view your historical data but won't be able to add new entries.

**Q: Can I cancel anytime?**
A: Yes! Cancel your subscription at any time. You'll have access until the end of your current billing period, and we offer a 30-day money-back guarantee.

**Q: What if I want to track my whole family?**
A: Check out our Family plans! Family Basic ($19.99/mo) supports up to 4 people, Family Plus ($29.99/mo) supports up to 10 people, and Family Premium ($39.99/mo) has unlimited seats.

**Q: How do I upgrade my plan?**
A: Go to Settings → Subscription → Choose Plan. You'll only pay the pro-rated difference for the current month.

**Q: Is my data safe if I don't pay?**
A: Yes! We keep your data for 90 days after your subscription ends. You can export it anytime, or reactivate your subscription to regain full access.

**Q: Do you offer refunds?**
A: Yes! We offer a 30-day money-back guarantee, no questions asked. After 30 days, we provide pro-rated refunds for the current month.

**Q: I'm a student/senior/veteran. Do you offer discounts?**
A: Yes! Email us at support@WPL.com with proof of status, and we'll provide a 30% discount on any plan.

---

## Support Response Templates

### Template: "Will I lose my data?"

```
Hi [Name],

Great question! Your data is always safe with us.

Here's what happens:

  ✅ If your subscription expires or is canceled:
     - Days 1-30: Full read-only access (you can view everything)
     - Days 30-90: Data archived (request export anytime)
     - Day 90+: Personal data anonymized (we keep aggregate analytics only)

  ✅ You can export your data anytime before Day 90:
     - Go to Settings → Export Data
     - Download as JSON or CSV
     - All your meals, weights, and progress included

  ✅ If you reactivate within 90 days:
     - Everything restored exactly as you left it
     - No data loss whatsoever

Bottom line: We'd never delete your hard-earned progress. It's yours.

Let me know if you have other questions!

Best,
[Support Team Name]
```

### Template: "Why do I have to pay now?"

```
Hi [Name],

Thanks for being an early user! I understand seeing pricing can feel sudden.

Here's the situation:

We launched WPL a few months ago to test the product with a small group
(that's you!). During that time, we didn't charge anyone because we were still
building features and fixing bugs.

Now that the app is stable and we're ready to grow, we need to make it
sustainable. Server costs, AI features, and ongoing development aren't free.

But here's the good news:

  ✅ If you signed up before [Launch Date], you're GRANDFATHERED.
     You keep free access forever. Seriously.

  ✅ New users (after [Launch Date]) start with a 30-day free trial,
     then pay $9.99/month.

So to answer your question: You don't have to pay! Your account stays free.

Did I misunderstand your question? Let me know and I'll clarify.

Best,
[Support Team Name]
```

---

## Email Signature for This Campaign

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Your Name]
Founder, WPL
support@WPL.com

Need help? Reply to this email—we read every message.

[Dashboard] [Feature Requests] [Refer a Friend]
```

---

## Metrics to Track

### Email Performance

- Open rate (target: >40% for founding member email)
- Click rate (target: >10%)
- Reply rate (indicates engagement)
- Unsubscribe rate (should be <1%)

### In-App Conversion

- Trial-to-paid conversion rate (target: 10-20%)
- Time to first upgrade prompt view
- Upgrade modal → checkout completion rate
- Plan distribution (which plan do people choose?)

### Support Volume

- Tickets related to pricing/billing
- Common questions (add to FAQ)
- Sentiment analysis (positive/negative/neutral)

---

## Roll-out Checklist

**Pre-Launch (Day -7 to Day -1):**
- [ ] Send grandfathering email to all 20 existing users
- [ ] Monitor email opens and replies
- [ ] Send follow-up to users who didn't open (Day -3)
- [ ] Update FAQ page on website
- [ ] Train support team on response templates
- [ ] Test in-app banners and modals in staging

**Launch Day (Day 0):**
- [ ] Deploy code with trial subscription creation
- [ ] Run migration script to grandfather existing users
- [ ] Verify grandfathered users see "Founding Member" banner
- [ ] Verify new signups get trial subscription
- [ ] Monitor error logs for subscription-related issues

**Post-Launch (Day 1-30):**
- [ ] Monitor trial conversion funnel daily
- [ ] Respond to support tickets within 24 hours
- [ ] Collect user feedback on pricing/messaging
- [ ] A/B test upgrade modal variations
- [ ] Send trial expiration reminders (automated)
