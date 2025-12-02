import { FAQItem } from '@/types/support'

/**
 * FAQ Knowledge Base
 *
 * Categories:
 * - Customer FAQs: Getting started, ordering, delivery, billing, fraud prevention
 * - Shopper FAQs: Getting started, shopping orders, delivery, payments
 */

export const faqs: FAQItem[] = [
  // ==================== CUSTOMER FAQs ====================

  // Getting Started
  {
    id: 'cust-001',
    category: 'customer',
    section: 'getting-started',
    question: 'How do I place my first order?',
    answer: `To place your first order:

1. **Create an account** - Sign up with your email or Google account
2. **Enter your address** - We'll check if we deliver to your area
3. **Browse products** - Search for items or browse by category
4. **Add to cart** - Select items and quantities you need
5. **Choose delivery window** - Pick a 2-hour delivery slot
6. **Add payment method** - We accept all major credit/debit cards
7. **Review and submit** - Double-check your order and delivery details
8. **Track your order** - Get real-time updates as your shopper works

**First-time tips:**
- Orders typically arrive within 2-4 hours
- You can communicate with your shopper during shopping
- Add delivery instructions for easy drop-off`,
    tags: ['new user', 'first order', 'getting started', 'how to order'],
    helpfulCount: 245,
    notHelpfulCount: 12,
    relatedArticles: ['cust-002', 'cust-003', 'cust-008'],
    lastUpdated: new Date('2024-11-15'),
    priority: 100,
    searchKeywords: ['first time', 'new', 'beginner', 'start']
  },

  {
    id: 'cust-002',
    category: 'customer',
    section: 'getting-started',
    question: 'What are delivery windows and how do they work?',
    answer: `Delivery windows are 2-hour time slots when your order will arrive.

**How it works:**
- Choose from available windows when placing your order
- We show windows based on shopper availability in your area
- Most areas have windows from 8am-10pm daily
- Peak times (weekends, evenings) may fill up quickly

**Timing:**
- **ASAP orders**: Delivered within 2-4 hours
- **Scheduled orders**: Book up to 7 days in advance
- **Same-day**: Must be placed 3+ hours before window

**Pro tips:**
- Book early morning for freshest produce
- Evening slots (6-8pm) are most popular
- Mid-week afternoons have best availability
- You'll get a 30-minute heads-up before arrival`,
    tags: ['delivery window', 'delivery time', 'schedule', 'timing'],
    helpfulCount: 189,
    notHelpfulCount: 8,
    relatedArticles: ['cust-001', 'cust-012'],
    lastUpdated: new Date('2024-11-10'),
    priority: 95
  },

  {
    id: 'cust-003',
    category: 'customer',
    section: 'getting-started',
    question: 'Which payment methods do you accept?',
    answer: `We accept all major payment methods:

**Credit/Debit Cards:**
- Visa, Mastercard, American Express, Discover
- All cards must support pre-authorization holds

**Digital Wallets:**
- Apple Pay
- Google Pay

**How charging works:**
1. **Pre-authorization**: We place a hold when you submit your order
2. **Shopping**: Actual amounts are tracked as shopper scans items
3. **Final charge**: Card is charged for actual total within 24 hours
4. **Hold release**: Pre-auth hold drops off in 3-5 business days

**Important notes:**
- We don't accept cash, checks, or PayPal
- Pre-auth may be 10-15% higher than estimate (for weight-based items)
- Refunds are processed back to original payment method
- You can save multiple cards for faster checkout`,
    tags: ['payment', 'credit card', 'apple pay', 'google pay', 'billing'],
    helpfulCount: 156,
    notHelpfulCount: 5,
    relatedArticles: ['cust-015', 'cust-016'],
    lastUpdated: new Date('2024-11-12'),
    priority: 90
  },

  // Ordering
  {
    id: 'cust-008',
    category: 'customer',
    section: 'ordering',
    question: 'Can I add items after submitting my order?',
    answer: `Yes, you can add items after submitting, but there's a small fee:

**Late-add fee: $0.10 per item**

**How to add items:**
1. Go to your active order
2. Tap "Add More Items"
3. Search and select products
4. Confirm additions (you'll see the $0.10 fee per item)

**When you can add:**
- ✅ Before shopper starts shopping
- ✅ While shopper is shopping (if store has item)
- ❌ After shopper has checked out

**Why the fee?**
Late additions require your shopper to backtrack or spend extra time finding items, so we apply a small operational fee.

**Pro tip:** Review your list carefully before submitting to avoid late-add fees!`,
    tags: ['add items', 'late add', 'forgot item', 'fee', 'after submit'],
    helpfulCount: 267,
    notHelpfulCount: 34,
    relatedArticles: ['cust-009', 'cust-010'],
    lastUpdated: new Date('2024-11-18'),
    priority: 85,
    searchKeywords: ['forgot', 'missed', 'additional']
  },

  {
    id: 'cust-009',
    category: 'customer',
    section: 'during-shopping',
    question: 'What happens if an item is out of stock?',
    answer: `When an item is unavailable, your shopper will:

**1. Send you a replacement suggestion**
- Similar item (same brand, different size)
- Alternative brand
- Comparable product

**2. You have 3 options:**
- ✅ **Approve** the replacement
- 🔄 **Request different** replacement
- ❌ **Skip** the item (no charge)

**3. Response time:**
- You have 5 minutes to respond
- No response = shopper uses best judgment
- You can set default preferences (always replace/always skip)

**Pricing:**
- Replacements are never more expensive
- If cheaper, you pay the lower price
- If more expensive, we eat the difference

**Communication:**
- Get push notifications for each substitution
- Text your shopper directly for specific requests
- View all changes in real-time in the app`,
    tags: ['out of stock', 'substitution', 'replacement', 'unavailable'],
    helpfulCount: 198,
    notHelpfulCount: 11,
    relatedArticles: ['cust-010', 'cust-011'],
    lastUpdated: new Date('2024-11-14'),
    priority: 88
  },

  {
    id: 'cust-010',
    category: 'customer',
    section: 'during-shopping',
    question: 'How do I communicate with my shopper?',
    answer: `You can message your shopper directly through the app:

**In-app messaging:**
- Tap "Message Shopper" on your active order
- Real-time text chat
- Get notifications when shopper responds
- Available from start of shopping until delivery

**When to message:**
- ✅ Specific brand preferences
- ✅ Ripeness for produce (bananas, avocados, etc.)
- ✅ Replacement instructions
- ✅ Special requests (check expiration dates, etc.)

**Response time:**
- Shoppers usually respond within 2-3 minutes
- They're actively shopping, so brief messages work best
- For urgent issues, they may call you

**Privacy:**
- Phone numbers are masked for both parties
- Messages are logged for quality/safety
- No personal contact info is shared

**Pro tip:** Add delivery instructions in advance to avoid last-minute messaging!`,
    tags: ['message', 'communication', 'contact', 'text', 'shopper'],
    helpfulCount: 143,
    notHelpfulCount: 6,
    relatedArticles: ['cust-009', 'cust-012'],
    lastUpdated: new Date('2024-11-11'),
    priority: 75
  },

  // Delivery
  {
    id: 'cust-012',
    category: 'customer',
    section: 'delivery',
    question: 'What is a delivery PIN and why do I need it?',
    answer: `Your delivery PIN is a 4-digit code that confirms you received your order.

**Why we use PINs:**
- 🛡️ **Prevents fraud** - Ensures groceries reach the right person
- 📸 **Photo evidence** - Shoppers can only complete delivery with PIN or photo
- 🔒 **Account security** - Protects against fake delivery claims

**How it works:**
1. PIN is generated when shopper arrives
2. You receive it via text/app notification
3. Give PIN to shopper verbally or show on phone
4. Shopper enters PIN to complete delivery

**If you're not home:**
- Shopper can leave groceries and take photo evidence
- You'll still get your items
- PIN isn't required if photo is taken
- Mark "OK to leave at door" in delivery instructions

**Forgot your PIN?**
- Check the app under "Active Order"
- Check your text messages
- Call support for assistance

**Security tip:** Never share your PIN until groceries are in your hands!`,
    tags: ['PIN', 'delivery code', 'verification', 'security', 'fraud prevention'],
    helpfulCount: 301,
    notHelpfulCount: 19,
    relatedArticles: ['cust-013', 'cust-019'],
    lastUpdated: new Date('2024-11-16'),
    priority: 98
  },

  {
    id: 'cust-013',
    category: 'customer',
    section: 'delivery',
    question: 'What if I\'m not home when the shopper arrives?',
    answer: `No problem! You have several options:

**Option 1: Leave-at-door (Recommended)**
- Add "OK to leave at door" in delivery instructions
- Specify safe location (front porch, side door, etc.)
- Shopper takes photo evidence
- No PIN required

**Option 2: Have someone else receive**
- Family member, roommate, neighbor
- Give them your delivery PIN
- They can accept on your behalf

**Option 3: Shopper will try to reach you**
- Call/text through app
- Wait 10 minutes
- If no response, leave at door with photo

**What to include in delivery instructions:**
- Gate codes or access instructions
- Preferred drop-off location
- "OK to leave at door" permission
- Any special considerations (pets, fragile items placement)

**Temperature concerns:**
- Cold items are in insulated bags
- Safe for 2-3 hours at door
- Bring inside as soon as possible
- Frozen items may start thawing after 1 hour`,
    tags: ['not home', 'leave at door', 'delivery instructions', 'absent'],
    helpfulCount: 234,
    notHelpfulCount: 15,
    relatedArticles: ['cust-012', 'cust-014'],
    lastUpdated: new Date('2024-11-13'),
    priority: 82
  },

  {
    id: 'cust-014',
    category: 'customer',
    section: 'after-delivery',
    question: 'How do I report missing or damaged items?',
    answer: `If items are missing or damaged, report them within 24 hours:

**How to report:**
1. Go to your order in the app
2. Tap "Report Issue"
3. Select "Missing Item" or "Damaged Item"
4. Upload a photo (required)
5. Submit - most claims are auto-approved instantly

**What to photograph:**
- **Missing items**: All delivered bags/items together
- **Damaged items**: Close-up showing damage
- **Wrong items**: Item you received vs. what you ordered

**Resolution:**
- ✅ **Auto-approved** (under $20): Instant refund
- 🔍 **Manual review** (over $20): Reviewed within 24 hours
- 📧 Email confirmation sent for all refunds

**Refund timeline:**
- Credit card: 3-5 business days
- Debit card: 5-7 business days
- Shows as pending credit immediately

**What's covered:**
- ✅ Items not delivered
- ✅ Spoiled/expired products
- ✅ Damaged packaging/crushed items
- ✅ Wrong items received
- ❌ Normal produce variations (color, size)
- ❌ Taste/quality preferences

**Fraud prevention:**
- Multiple false claims will flag your account
- We compare photos to receipt and shopper photos
- Excessive claims may require account review`,
    tags: ['missing items', 'damaged', 'refund', 'report problem', 'issue'],
    helpfulCount: 412,
    notHelpfulCount: 28,
    relatedArticles: ['cust-016', 'cust-017'],
    lastUpdated: new Date('2024-11-17'),
    priority: 95
  },

  // Billing
  {
    id: 'cust-015',
    category: 'customer',
    section: 'billing',
    question: 'Why is there a hold on my card for more than my order total?',
    answer: `The pre-authorization hold is intentionally higher than your estimated total. Here's why:

**Reasons for the hold amount:**
- 📦 Weight-based items (produce, meat, deli) vary by actual weight
- 🔄 Out-of-stock replacements may differ in price
- ➕ Last-minute item additions ($0.10 fee each)
- 📊 Typical variance is 10-15% of estimate

**Example:**
- Estimated order: $100
- Pre-auth hold: $115 (15% buffer)
- Actual total: $103
- **Final charge: $103** (not $115)

**Timeline:**
1. **Order submitted**: Pre-auth hold placed
2. **Shopping complete**: Actual total calculated
3. **Within 24 hours**: Card charged for actual amount
4. **3-5 business days**: Hold releases (bank dependent)

**Important notes:**
- You're only charged for items you actually receive
- The hold is NOT a charge - it reserves funds temporarily
- If actual total is less, the difference is never charged
- Some banks show holds as "pending charges" - check with your bank

**Minimize variance:**
- Order exact-weight items instead of "per lb" when possible
- Set clear replacement preferences
- Review your list carefully before submitting`,
    tags: ['pre-authorization', 'hold', 'pending charge', 'billing', 'card hold'],
    helpfulCount: 387,
    notHelpfulCount: 42,
    relatedArticles: ['cust-003', 'cust-016'],
    lastUpdated: new Date('2024-11-15'),
    priority: 92,
    searchKeywords: ['pre-auth', 'pending', 'charge', 'more than']
  },

  {
    id: 'cust-016',
    category: 'customer',
    section: 'billing',
    question: 'How long do refunds take to process?',
    answer: `Refund timing depends on your payment method:

**Credit Cards: 3-5 business days**
- Refund initiated immediately upon approval
- Shows as pending credit within 24 hours
- Posts to account in 3-5 business days

**Debit Cards: 5-7 business days**
- Same process as credit cards
- Banks process debit refunds slower
- May take up to 7 business days

**Digital Wallets (Apple Pay/Google Pay): 3-5 business days**
- Refund goes to linked card
- Timeline matches card type above

**What happens:**
1. **Instant**: Refund approved in app
2. **Within 1 hour**: Refund initiated to payment processor
3. **24 hours**: Shows as pending credit
4. **3-7 days**: Funds available in your account

**Tracking your refund:**
- Check order history in app for refund status
- Email confirmation sent when processed
- Shows refund amount and date
- Contact support if not received after 7 days

**Multiple items:**
- Each refunded item is listed separately
- Single refund transaction for entire order
- Partial refunds are processed same-day

**Bank holidays:**
- Add 1-2 days if refund initiated before holiday
- Weekends don't count as business days`,
    tags: ['refund', 'refund time', 'money back', 'processing time'],
    helpfulCount: 298,
    notHelpfulCount: 22,
    relatedArticles: ['cust-014', 'cust-015', 'cust-017'],
    lastUpdated: new Date('2024-11-14'),
    priority: 88
  },

  {
    id: 'cust-017',
    category: 'customer',
    section: 'billing',
    question: 'What are late-add fees and how can I avoid them?',
    answer: `Late-add fees are charged when you add items after submitting your order.

**Fee structure:**
- **$0.10 per item** added after order submission
- Applies to any item, regardless of price
- Example: Add 5 items = $0.50 in fees

**When fees apply:**
- ✅ Items added before shopper starts shopping
- ✅ Items added while shopper is actively shopping
- ❌ No fees for items added during initial order creation

**Why the fee?**
Adding items after submission requires your shopper to:
- Backtrack through the store
- Spend additional time locating items
- Potentially delay delivery to other customers

The $0.10 fee compensates shoppers for this extra work.

**How to avoid late-add fees:**
1. **Make a complete list** before starting your order
2. **Check your pantry** to avoid forgetting staples
3. **Review your cart** before submitting
4. **Use recurring items** feature for regular purchases
5. **Add to cart as you think of items** (no rush to submit)

**Removing items:**
- ❌ No fee to remove items before shopping starts
- ❌ Cannot remove items after shopper starts shopping

**Pro tip:** Keep a running grocery list on your phone throughout the week!`,
    tags: ['late add', 'fees', 'additional items', 'charges', 'add after'],
    helpfulCount: 176,
    notHelpfulCount: 45,
    relatedArticles: ['cust-008', 'cust-015'],
    lastUpdated: new Date('2024-11-12'),
    priority: 70
  },

  // Fraud Prevention
  {
    id: 'cust-019',
    category: 'customer',
    section: 'fraud-prevention',
    question: 'Why do you require photo evidence for deliveries?',
    answer: `Photo evidence protects both customers and shoppers from fraud.

**What shoppers photograph:**
- 📸 Full receipt showing all items and prices
- 📸 Items at delivery location (if left at door)
- 📸 Any damaged items found during shopping

**Why photos matter:**
- ✅ Verifies items were purchased (receipt photo)
- ✅ Proves delivery location (at-door photo)
- ✅ Resolves "didn't receive" disputes
- ✅ Documents condition at delivery
- ✅ Protects shoppers from false claims

**Your privacy:**
- Photos are stored securely
- Only visible to you, shopper, and support team
- Automatically deleted after 90 days
- Never shared publicly or sold

**When photos are taken:**
1. **Receipt scan**: After checkout (always required)
2. **Delivery photo**: If you're not home OR if PIN not provided
3. **Damage documentation**: If items damaged during shopping

**Disputed claims:**
- Support reviews photos when investigating claims
- Compares delivered items vs. receipt
- Helps approve legitimate refund requests faster

**No photos taken if:**
- You're home and provide delivery PIN
- Hand-off delivery with face-to-face contact

**Your rights:**
- Request to see delivery photos anytime
- Photos cannot be used for marketing
- Compliant with privacy regulations`,
    tags: ['photo', 'evidence', 'privacy', 'fraud', 'delivery photo', 'receipt'],
    helpfulCount: 267,
    notHelpfulCount: 38,
    relatedArticles: ['cust-012', 'cust-020'],
    lastUpdated: new Date('2024-11-16'),
    priority: 75
  },

  {
    id: 'cust-020',
    category: 'customer',
    section: 'fraud-prevention',
    question: 'How do you protect my account from unauthorized access?',
    answer: `We use multiple layers of security to protect your account:

**Account security features:**
- 🔒 **Encrypted passwords** - Industry-standard hashing
- 📱 **Two-factor authentication** - Optional SMS/email verification
- 🔐 **Session management** - Auto-logout after inactivity
- 🚨 **Login alerts** - Notifications for new device logins

**Payment security:**
- 💳 **Tokenized cards** - Card numbers never stored in plain text
- 🏦 **PCI compliance** - Bank-level encryption standards
- 🛡️ **Fraud detection** - AI monitors for unusual activity
- 📊 **Purchase limits** - Flags abnormal order sizes

**Delivery verification:**
- 📍 **Address validation** - Must match payment card
- 🔢 **PIN codes** - Unique per delivery
- 📸 **Photo evidence** - Required for no-contact deliveries
- 👤 **Shopper verification** - Background-checked drivers

**What you can do:**
1. **Use a strong password** (12+ characters, mixed case, numbers, symbols)
2. **Enable two-factor authentication** in account settings
3. **Don't share your PIN** until groceries are in hand
4. **Review orders immediately** after delivery
5. **Log out on shared devices**
6. **Update password regularly** (every 90 days recommended)

**If your account is compromised:**
- Change password immediately
- Contact support to freeze account
- Review order history for unauthorized purchases
- Update payment methods
- Enable 2FA if not already active

**Red flags:**
- 🚩 Orders you didn't place
- 🚩 Login from unfamiliar location/device
- 🚩 Changed email or phone number
- 🚩 New payment methods you didn't add

**Contact support immediately if you notice any suspicious activity!**`,
    tags: ['security', 'account safety', 'password', 'fraud', 'hack', 'unauthorized'],
    helpfulCount: 189,
    notHelpfulCount: 8,
    relatedArticles: ['cust-019', 'cust-003'],
    lastUpdated: new Date('2024-11-18'),
    priority: 85
  },

  // ==================== SHOPPER FAQs ====================

  // Getting Started
  {
    id: 'shop-001',
    category: 'shopper',
    section: 'shopper-getting-started',
    question: 'How do I become a shopper?',
    answer: `Becoming a shopper is easy! Here's the process:

**Requirements:**
- ✅ **Age**: 18+ years old
- ✅ **License**: Valid driver's license
- ✅ **Vehicle**: Reliable car or truck
- ✅ **Phone**: Smartphone (iPhone or Android)
- ✅ **Availability**: 10+ hours per week minimum

**Application steps:**
1. **Apply online** - Fill out basic information (10 minutes)
2. **Background check** - We verify driving record and criminal history (2-5 days)
3. **Stripe card setup** - You'll receive a company debit card for purchases (3-7 days)
4. **Complete training** - Watch tutorial videos and take quiz (1 hour)
5. **Schedule orientation** - Virtual or in-person (optional)
6. **Start shopping!** - Accept your first order

**Background check includes:**
- Driving record (past 3 years)
- Criminal history
- Sex offender registry
- Social Security verification

**Stripe card:**
- Used for all customer purchases
- Loaded automatically per order
- No personal funds needed
- Track all transactions in real-time

**Training covers:**
- Finding items efficiently
- Quality selection (produce, meat, etc.)
- Handling substitutions
- Customer communication
- Delivery best practices
- Safety protocols

**Timeline:**
- Most shoppers are approved within 5-7 days
- Fast-track available for experienced shoppers
- Start earning immediately after approval

**Questions?** Contact shopper support at shoppers@example.com`,
    tags: ['become shopper', 'apply', 'requirements', 'sign up', 'driver'],
    helpfulCount: 342,
    notHelpfulCount: 23,
    relatedArticles: ['shop-002', 'shop-003'],
    lastUpdated: new Date('2024-11-15'),
    priority: 100
  },

  {
    id: 'shop-002',
    category: 'shopper',
    section: 'shopper-getting-started',
    question: 'How do I set up and use my Stripe card?',
    answer: `Your Stripe card is your tool for purchasing customer orders:

**What is the Stripe card?**
- Company-issued debit card for customer purchases
- Loaded automatically when you accept an order
- No personal funds needed ever
- Physical card + digital wallet compatible

**Setup process:**
1. **Card arrives in mail** (3-7 days after approval)
2. **Activate in app** - Scan card or enter numbers
3. **Add to digital wallet** - Optional: Apple Pay/Google Pay
4. **Start shopping** - Card is ready to use

**How it works:**
- ✅ Accept order → Card loaded with estimated total + 15% buffer
- ✅ Shop and scan items → Balance updates in real-time
- ✅ Checkout → Use Stripe card at register
- ✅ Complete delivery → Remaining balance removed

**Card limits:**
- Single transaction: Up to $500
- Daily limit: $2,000 (increases with good history)
- Per-order limit: Matches order total + buffer

**Troubleshooting declined cards:**
1. **Check app** - Verify order is still active
2. **Check balance** - Ensure card is loaded (show cashier)
3. **Contact support** - We can reload or increase limit immediately
4. **Split tender** - Pay with Stripe card + personal card, then get reimbursed

**Security:**
- 🔒 Card is in your name
- 🔒 Only active during accepted orders
- 🔒 Automatically disabled when not working
- 🔒 Report lost/stolen for instant replacement

**Important rules:**
- ❌ Never use for personal purchases
- ❌ Never withdraw cash
- ❌ Never share card info
- ✅ Keep card in safe place
- ✅ Notify us immediately if lost/stolen

**Digital wallet benefits:**
- Faster checkout
- No need to carry physical card
- Works even if physical card is lost
- Still shows as Stripe transaction`,
    tags: ['stripe card', 'payment card', 'shopping card', 'setup', 'activate'],
    helpfulCount: 289,
    notHelpfulCount: 31,
    relatedArticles: ['shop-001', 'shop-011'],
    lastUpdated: new Date('2024-11-14'),
    priority: 95
  },

  // Shopping Orders
  {
    id: 'shop-006',
    category: 'shopper',
    section: 'shopping-orders',
    question: 'What should I do when items are out of stock?',
    answer: `When items are unavailable, follow this process:

**Step 1: Mark item as unavailable**
- Tap item in your shopping list
- Select "Out of stock"
- App suggests similar replacements

**Step 2: Choose best replacement**
Look for alternatives in this order:
1. **Same brand, different size** (e.g., 16oz instead of 12oz)
2. **Same product, different brand** (e.g., store brand instead of name brand)
3. **Similar product** (e.g., rotini instead of penne pasta)

**Step 3: Send replacement suggestion**
- Take photo of suggested item
- App sends notification to customer
- Wait 5 minutes for response

**Customer responses:**
- ✅ **Approved** - Add to cart and continue
- 🔄 **Different replacement** - Find their suggestion
- ❌ **Skip item** - Don't purchase anything

**No response after 5 minutes?**
Use your best judgment:
- For staples (milk, bread), choose reasonable replacement
- For specialty items, skip unless very similar
- Always choose equal or lesser price
- Document your reasoning in notes

**Best practices:**
- ✅ Check nearby endcaps and displays
- ✅ Ask store employee if item is in back
- ✅ Take clear photo of replacement
- ✅ Choose fresher product if available
- ❌ Never choose more expensive replacement
- ❌ Don't substitute without customer approval

**Common situations:**
- **Produce**: Similar variety (Gala instead of Fuji apples)
- **Meat**: Same cut, different package size
- **Packaged goods**: Same product, smaller/larger size
- **Bread**: Fresh bakery instead of packaged (or vice versa)

**Quality tips:**
- Check expiration dates (furthest out)
- Inspect produce for ripeness/damage
- Verify weight on meat packages
- Ensure cold chain hasn't been broken

**If customer is picky:**
- Some profiles note "No substitutions"
- Respect preferences even if inconvenient
- Better to skip than get poor rating`,
    tags: ['out of stock', 'substitution', 'replacement', 'unavailable', 'alternatives'],
    helpfulCount: 456,
    notHelpfulCount: 18,
    relatedArticles: ['shop-007', 'shop-008'],
    lastUpdated: new Date('2024-11-17'),
    priority: 98
  },

  {
    id: 'shop-007',
    category: 'shopper',
    section: 'shopping-orders',
    question: 'How do I ensure I select quality produce and meat?',
    answer: `Quality selection is crucial for customer satisfaction:

**PRODUCE SELECTION**

**Ripeness:**
- **Bananas**: Check customer notes - some want green, some want ripe
- **Avocados**: Gentle squeeze - ripe should give slightly
- **Tomatoes**: Firm with slight give, no soft spots
- **Stone fruits**: Smell stem end - should be fragrant

**Freshness indicators:**
- ✅ Vibrant color (no browning/yellowing)
- ✅ Firm texture (no mushiness)
- ✅ No mold, bruises, or cuts
- ✅ Leaves are green and crisp (lettuce, herbs)

**MEAT & SEAFOOD**

**Beef:**
- Bright cherry red color
- Minimal liquid in package
- Firm to touch (through packaging)
- Fat is white, not yellow
- Furthest expiration date

**Chicken:**
- Pink color (not gray)
- No strong odor
- Package fully sealed
- Plump, not dried out

**Fish:**
- Clear, bright eyes (whole fish)
- Firm flesh (springs back when pressed)
- Ocean smell, not "fishy"
- Shiny appearance

**Pork:**
- Pinkish-red color
- Marbling visible
- No discoloration
- Latest sell-by date

**GENERAL TIPS**

**Always:**
- ✅ Check expiration/best-by dates
- ✅ Look at back of shelf for fresher stock
- ✅ Inspect all sides of package
- ✅ Keep cold items cold (grab last)
- ✅ Bag separately (raw meat away from produce)

**Ask yourself:**
- "Would I buy this for myself?"
- "Is this the same quality I'd expect?"
- "Would I be happy receiving this?"

**When in doubt:**
- Message customer with photo
- Ask store employee for fresher stock
- Choose pre-packaged over loose (less handling)

**Common mistakes to avoid:**
- ❌ Grabbing first item you see
- ❌ Choosing damaged/bruised produce
- ❌ Meat near expiration date
- ❌ Crushed or dented cans
- ❌ Torn or open packages

**Pro shopper tips:**
- Learn store layouts to find freshest sections
- Build rapport with store employees for back stock access
- Morning shops = freshest produce
- Weekend = picked over - be extra selective`,
    tags: ['quality', 'produce', 'meat', 'selection', 'fresh', 'groceries'],
    helpfulCount: 378,
    notHelpfulCount: 15,
    relatedArticles: ['shop-006', 'shop-008'],
    lastUpdated: new Date('2024-11-16'),
    priority: 90
  },

  // Delivery
  {
    id: 'shop-010',
    category: 'shopper',
    section: 'shopper-delivery',
    question: 'How does delivery PIN verification work?',
    answer: `The delivery PIN ensures groceries reach the right person:

**PIN process:**
1. **Arrive at delivery location** - Tap "I've arrived"
2. **PIN is generated** - Customer receives 4-digit code via text/app
3. **Customer provides PIN** - Verbally or shows on phone
4. **Enter PIN in app** - Confirms delivery completion
5. **Order complete** - Earnings are finalized

**When customer is home:**
- ✅ Knock/doorbell and wait
- ✅ Ask for delivery PIN
- ✅ Hand over groceries
- ✅ Enter PIN in app
- ✅ Thank customer and leave

**When customer is NOT home:**
- 🔔 Ring doorbell/knock
- 📱 Call/text through app
- ⏱️ Wait 5-10 minutes
- 📸 Take photo of groceries at door
- ✅ Mark "Left at door - no PIN"

**Photo requirements if no PIN:**
- Clear view of all bags/items
- Shows door number or identifiable location
- Good lighting
- All groceries visible
- Photo uploads before completing delivery

**Fraud prevention:**
- ❌ Never complete delivery without PIN or photo
- ❌ Don't give groceries to neighbors without customer approval
- ❌ Don't leave at door without photo evidence
- ✅ Always verify address before dropping off
- ✅ Contact support if suspicious situation

**Common scenarios:**

**"I'm in the driveway, can you come out?"**
- ✅ OK for customers who can't come to door (elderly, disabled)
- ✅ Still verify PIN
- ❌ Don't drive away until PIN entered

**"Leave it at the door, no need for PIN"**
- ✅ OK if customer approved "leave at door" in delivery notes
- ✅ Still take photo evidence
- ❌ Don't skip photo if no PIN

**"I didn't get the PIN yet"**
- Tell customer to check app/texts
- Offer to wait 2-3 minutes
- Customer can call support to retrieve PIN
- If long delay, take photo and proceed

**Wrong address:**
- Customer ordered to work but is at home
- Call/text customer immediately
- Don't leave at wrong address
- Let customer update or cancel
- Contact support if customer unreachable

**Your protection:**
- PINs prove successful delivery
- Photos protect against false "didn't receive" claims
- GPS timestamp logs your location
- Never skip these steps!`,
    tags: ['PIN', 'delivery', 'verification', 'completion', 'photo evidence'],
    helpfulCount: 423,
    notHelpfulCount: 27,
    relatedArticles: ['shop-011', 'shop-012'],
    lastUpdated: new Date('2024-11-18'),
    priority: 95
  },

  {
    id: 'shop-011',
    category: 'shopper',
    section: 'shopper-delivery',
    question: 'What should I do if the customer doesn\'t answer at delivery?',
    answer: `Follow these steps when customer doesn't respond:

**Step-by-step process:**

**1. Arrive at location (0 minutes)**
- Tap "I've arrived" in app
- Verify address matches order
- Look for delivery instructions

**2. First contact attempt (0-2 minutes)**
- Ring doorbell or knock loudly
- Check delivery notes for special instructions
- Look around for customer outside

**3. Second contact attempt (2-5 minutes)**
- Call customer through app
- If no answer, send text: "Hi! I'm here with your groceries at [address]. Please come to the door or let me know where to leave them."
- Wait for response

**4. Third attempt (5-8 minutes)**
- Knock/ring again
- Try calling one more time
- Check if customer responded to text

**5. Decision time (8-10 minutes)**

**If delivery notes say "OK to leave at door":**
- ✅ Find safe, dry location
- ✅ Place groceries neatly
- ✅ Take clear photo
- ✅ Send text: "Left at your front door as requested!"
- ✅ Complete delivery in app

**If NO leave-at-door permission:**
- Still leave at door (groceries will spoil in car)
- Take photo evidence (REQUIRED)
- Text customer: "Couldn't reach you. Left groceries at front door. Please bring inside ASAP."
- Mark "Left at door - no PIN" in app

**6. Complete delivery**
- Never take groceries back
- Never leave at wrong address
- Photo is mandatory if no PIN

**Safe drop-off locations:**
- ✅ Covered front porch
- ✅ Between screen door and main door
- ✅ Side entrance (if noted)
- ✅ Apartment lobby (if secure)
- ❌ Exposed to weather
- ❌ Visible from street (theft risk)
- ❌ Blocking doorway

**Temperature-sensitive items:**
- Cold/frozen items are in insulated bags
- Safe for 2-3 hours
- Customer should retrieve ASAP
- You've done your part - not your responsibility after delivery

**Apartment buildings:**
- Call customer for gate/building codes
- Leave at apartment door, not lobby (unless instructed)
- Take photo showing apartment number
- Never leave in unsecured common areas

**Safety concerns:**
- Aggressive pets visible
- Unsafe neighborhood
- Suspicious activity
- Dark/unlit location

**If unsafe, contact support immediately:**
- Don't put yourself at risk
- Support can cancel delivery
- You'll still be paid
- Customer will be rescheduled

**Your time matters:**
- 10 minutes max at delivery location
- Other customers are waiting
- Proper photo evidence protects you
- Move on after following protocol

**What NOT to do:**
- ❌ Take groceries back to store
- ❌ Wait more than 10 minutes
- ❌ Leave at neighbor's house
- ❌ Complete delivery without photo
- ❌ Drive away without attempting contact`,
    tags: ['no answer', 'customer not home', 'leave at door', 'delivery protocol'],
    helpfulCount: 367,
    notHelpfulCount: 22,
    relatedArticles: ['shop-010', 'shop-012'],
    lastUpdated: new Date('2024-11-15'),
    priority: 88
  },

  // Payments
  {
    id: 'shop-013',
    category: 'shopper',
    section: 'payments',
    question: 'How and when do I get paid?',
    answer: `Shopper earnings are straightforward and reliable:

**EARNINGS BREAKDOWN**

**Per order, you earn:**
- 💰 **Base pay**: $7-15 (based on order size, distance, time)
- 💵 **Tips**: 100% of customer tips (suggested 15-20%)
- 🎯 **Bonuses**: Peak time bonuses, streak bonuses, referrals
- ⭐ **Incentives**: High rating bonuses, speed bonuses

**Base pay factors:**
- Number of items
- Store distance from customer
- Estimated shopping time
- Peak/off-peak hours
- Store difficulty (layout, crowds)

**PAYMENT SCHEDULE**

**Instant Cashout (Recommended):**
- Cash out anytime you want
- Minimum: $5
- Fee: $0.50 per cashout
- Arrives in bank in 30 minutes
- Available 24/7

**Weekly Direct Deposit (Free):**
- Automatic every Monday
- No fees
- Covers previous Monday-Sunday
- Arrives by end of business day

**TRACKING EARNINGS**

**In the app:**
- Real-time earnings per order
- Daily/weekly totals
- Tips separate from base pay
- Breakdown of bonuses
- Year-to-date summary for taxes

**After each order:**
- ✅ Base pay shown immediately
- ⏱️ Tips appear within 24 hours (customers can adjust)
- 📊 Bonuses applied at end of week

**MAXIMIZING EARNINGS**

**Pro tips:**
- 🎯 Work peak hours (weekends, evenings) for higher base pay
- ⚡ Accept orders quickly (faster shoppers get priority)
- ⭐ Maintain 4.8+ rating for bonuses
- 🔥 Complete 10+ orders/week for streak bonuses
- 📍 Stay near popular stores
- 💬 Communicate well (better tips)
- 🛒 Be efficient (more orders per hour)

**Bonus opportunities:**
- **Peak pay**: +$3-5 per order during busy times
- **Streak bonuses**: +$20 for 5 orders in a row
- **Weekend bonus**: +$50 for 20 orders Sat/Sun
- **Referral bonus**: $250 per referred shopper (after their 50th order)

**TAXES**

**You are an independent contractor:**
- Receive 1099-NEC form in January
- Responsible for your own taxes
- Track mileage for deductions (IRS standard rate)
- Quarterly estimated tax payments recommended

**Tax deductions:**
- ✅ Mileage (65.5¢/mile for 2023)
- ✅ Phone bill (portion used for work)
- ✅ Insulated bags, supplies
- ✅ Car maintenance
- ❌ Stripe card purchases (not your money)

**COMMON QUESTIONS**

**"Why didn't I get the full tip?"**
- Customers can adjust tips up to 24 hours after delivery
- Damaged items or poor service may reduce tip
- Check order details for any issues reported

**"My base pay was lower than estimated"**
- Estimates shown before accepting
- Actual pay based on final order total
- Customer removed items = lower pay
- Always within $1-2 of estimate

**"When do bonuses appear?"**
- Peak pay: Immediate
- Streak bonuses: After completing streak
- Weekly bonuses: Monday with direct deposit
- Referral bonuses: After referee hits milestone`,
    tags: ['pay', 'earnings', 'payment', 'money', 'when paid', 'cashout'],
    helpfulCount: 501,
    notHelpfulCount: 19,
    relatedArticles: ['shop-014', 'shop-015'],
    lastUpdated: new Date('2024-11-17'),
    priority: 100
  },

  {
    id: 'shop-014',
    category: 'shopper',
    section: 'payments',
    question: 'What are the card spending limits and how can I increase them?',
    answer: `Your Stripe card has built-in limits for security:

**DEFAULT LIMITS**

**New shoppers:**
- Single transaction: $300
- Per order: $350
- Daily maximum: $1,000

**Experienced shoppers (50+ orders, 4.7+ rating):**
- Single transaction: $500
- Per order: $600
- Daily maximum: $2,000

**Top-tier shoppers (200+ orders, 4.9+ rating):**
- Single transaction: $750
- Per order: $1,000
- Daily maximum: $3,500

**HOW LIMITS WORK**

**Per-order loading:**
- Card is loaded when you accept order
- Amount = Estimated total + 15% buffer
- Example: $200 order → Card loaded with $230

**During shopping:**
- Scan items as you add to cart
- Balance updates in real-time
- See remaining balance in app

**At checkout:**
- Total must be within loaded amount
- If over, contact support immediately
- Support can reload card in 2-3 minutes

**CARD DECLINED? HERE'S WHY:**

**1. Order cancelled while shopping**
- Customer or system cancelled
- Card balance removed
- Stop shopping and contact support

**2. Balance insufficient**
- Heavy items (water, dog food) weigh more than estimated
- Multiple weight-based items exceeded estimates
- Customer added items late (card not reloaded yet)
- **Solution**: Contact support to reload

**3. Daily limit reached**
- You've shopped $1,000+ today (new shopper)
- Rare unless doing many large orders
- **Solution**: Request temporary increase

**4. Technical issue**
- Card not activated properly
- Network connectivity at store
- Stripe system maintenance (rare)
- **Solution**: Contact support

**INCREASING YOUR LIMITS**

**Automatic increases:**
- ✅ Complete 50 orders → Tier 2 limits
- ✅ Complete 200 orders → Tier 3 limits
- ✅ Maintain 4.7+ rating
- ✅ Zero fraud/misuse incidents

**Temporary increase (for large orders):**
1. See large order ($400+) available
2. Before accepting, contact support
3. Request limit increase for that specific order
4. Accept order once approved
5. Limit returns to normal after delivery

**Permanent increase requests:**
- Must have 100+ completed orders
- 4.8+ rating required
- No payment issues in past 30 days
- Email shoppers@example.com with request

**WHAT TO DO WHEN DECLINED**

**AT THE REGISTER:**
1. Stay calm and polite
2. Tell cashier: "I need to contact my payment company"
3. Step aside so others can check out
4. Open app and tap "Payment Issue"
5. Support will reload card or increase limit
6. Retry transaction in 2-3 minutes

**SPLIT PAYMENT (Emergency):**
- Use Stripe card for maximum amount
- Pay difference with personal card
- Take photo of both receipts
- Submit reimbursement request in app
- Reimbursed within 24 hours

**PREVENTING ISSUES**

**Before accepting orders:**
- ✅ Check order size vs. your limit
- ✅ Note if many weight-based items
- ✅ Contact support proactively for $350+ orders
- ✅ Ensure card is activated

**During shopping:**
- ✅ Monitor running total in app
- ✅ Scan items as you go (updates balance)
- ✅ Contact support if approaching limit
- ✅ Don't wait until checkout to notice

**FRAUD PREVENTION**

**Never:**
- ❌ Use card for personal purchases
- ❌ Withdraw cash from ATM
- ❌ Share card info with anyone
- ❌ Use card when not on active order

**Violations result in:**
- Immediate card deactivation
- Account suspension
- Deduction from earnings
- Potential legal action

**Questions?**
Contact shopper support 24/7 at (555) 123-4567`,
    tags: ['card limit', 'spending limit', 'declined', 'stripe card', 'increase limit'],
    helpfulCount: 434,
    notHelpfulCount: 28,
    relatedArticles: ['shop-002', 'shop-013'],
    lastUpdated: new Date('2024-11-16'),
    priority: 92
  },

  {
    id: 'shop-015',
    category: 'shopper',
    section: 'issues-escalation',
    question: 'What should I do if a customer makes a false fraud claim?',
    answer: `False fraud claims can happen. Here's how to protect yourself:

**WHAT ARE FALSE CLAIMS?**

**Common false claims:**
- "I never received my order" (you have photo proof)
- "Half my items were missing" (receipt shows all purchased)
- "All my produce was rotten" (you selected quality items)
- "Wrong items delivered" (receipt matches order)

**Why customers make false claims:**
- 💰 Trying to get free groceries
- 😤 Unhappy about something else (late delivery, substitutions)
- 🤷 Genuine mistake (family member brought in groceries)
- 📦 Porch pirates (stolen after you left)

**YOUR PROTECTION**

**Evidence we track:**
- ✅ GPS timestamp at delivery location
- ✅ Photo evidence (if no PIN)
- ✅ Receipt scan showing all items
- ✅ In-app messages with customer
- ✅ Item scan history during shopping
- ✅ PIN entry (if provided)

**This evidence protects you from:**
- ❌ "Didn't receive" claims (GPS + photo)
- ❌ "Missing items" claims (receipt scan)
- ❌ "Wrong items" claims (scan history)
- ❌ "Late delivery" claims (timestamp)

**WHEN YOU'RE ACCUSED**

**Notification:**
- You'll receive alert about customer claim
- Details of what customer reported
- Opportunity to provide your side
- Claim is under review (not automatic fault)

**Respond immediately:**
1. **Review the delivery**
   - Check your delivery photo
   - Review receipt scan
   - Check GPS timestamp
   - Recall any issues during delivery

2. **Submit your response**
   - Describe delivery (customer present? left at door?)
   - Note any special circumstances
   - Mention any communication with customer
   - Be factual, not emotional

3. **Provide additional evidence**
   - Screenshots of messages
   - Photos you took (quality of items, full cart, etc.)
   - Timestamp of when you left location
   - Any witnesses (store staff, neighbors who saw you)

**INVESTIGATION PROCESS**

**Support will review:**
- Your delivery photo (is location clear?)
- Receipt scan (all items purchased?)
- Customer's photo evidence (if provided)
- GPS data (were you at location?)
- Your shopping history (pattern of issues?)
- Customer's claim history (serial claimer?)

**Outcomes:**
- ✅ **Claim denied**: No impact on you
- ⚠️ **Claim approved**: May impact rating, no earnings deduction
- ❌ **Fault found**: Rare - only if clear evidence of wrongdoing

**BEST PRACTICES TO AVOID CLAIMS**

**During shopping:**
- ✅ Scan all items as you add to cart
- ✅ Take photo of full cart before checkout
- ✅ Double-check order before checkout
- ✅ Save receipt scan

**During delivery:**
- ✅ Take clear photo if no PIN
- ✅ Photo should show address/apartment number
- ✅ All bags/items visible in photo
- ✅ Message customer when delivered
- ✅ Verify address before leaving

**Communication:**
- ✅ Respond to customer questions quickly
- ✅ Inform about substitutions
- ✅ Be professional and friendly
- ✅ Document any issues in real-time

**SERIAL FRAUD CUSTOMERS**

**Red flags:**
- Customer has filed 5+ claims recently
- Always claims "never received"
- Neighborhood known for porch pirates
- Customer seems evasive when you arrive

**What we do:**
- Track customer claim patterns
- Flag accounts with excessive claims
- Require video evidence for repeat offenders
- Suspend customers abusing system

**What you should do:**
- Follow normal protocols
- Take extra-detailed photos
- Consider ringing doorbell multiple times
- Try to get PIN instead of leaving at door

**YOUR RATING**

**False claims and ratings:**
- Customer can leave 1-star rating with claim
- You can dispute rating if claim proven false
- Rating may be removed after investigation
- Multiple proven false claims = customer banned

**Protecting your rating:**
- Maintain photo evidence for every delivery
- Respond professionally to all claims
- Don't take it personally (happens to everyone)
- Focus on next order

**SERIOUS ALLEGATIONS**

**If customer claims:**
- Theft (took items for yourself)
- Threatening behavior
- Damaged property
- Inappropriate conduct

**Immediate actions:**
- Contact shopper support immediately
- Provide detailed account of delivery
- Request review of all evidence
- Do not contact customer directly

**These claims are investigated thoroughly:**
- Video footage from stores (if applicable)
- GPS and timeline analysis
- Background pattern review
- May involve suspension during investigation

**GETTING HELP**

**24/7 shopper support:**
- Phone: (555) 123-4567
- In-app chat: Tap "Help" → "False Claim"
- Email: shoppers@example.com

**Remember:**
- One or two claims won't tank your account
- Evidence is on your side if you follow protocols
- We investigate fairly - innocent until proven guilty
- Focus on quality service to prevent legitimate claims`,
    tags: ['fraud claim', 'false accusation', 'dispute', 'customer complaint', 'protection'],
    helpfulCount: 389,
    notHelpfulCount: 31,
    relatedArticles: ['shop-010', 'shop-011'],
    lastUpdated: new Date('2024-11-18'),
    priority: 85
  }
]

// Helper function to get FAQs by category
export function getFAQsByCategory(category: 'customer' | 'shopper' | 'both'): FAQItem[] {
  return faqs.filter(faq => faq.category === category || faq.category === 'both')
}

// Helper function to get FAQs by section
export function getFAQsBySection(section: string): FAQItem[] {
  return faqs.filter(faq => faq.section === section)
}

// Helper function to get related FAQs
export function getRelatedFAQs(faqId: string): FAQItem[] {
  const faq = faqs.find(f => f.id === faqId)
  if (!faq || !faq.relatedArticles) return []

  return faqs.filter(f => faq.relatedArticles.includes(f.id))
}
