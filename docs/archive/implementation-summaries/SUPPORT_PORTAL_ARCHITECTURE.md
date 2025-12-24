# Support Portal Architecture

## Overview
Multi-portal support system for customers, shoppers/drivers, and admin.

---

## Portal Structure

### **1. Customer Support Portal**
`/support/customer`

#### **Features:**
- Live chat support
- FAQ / Knowledge base
- Order tracking & history
- Issue reporting
- Refund requests
- Delivery PIN retrieval

#### **FAQ Categories:**
1. **Getting Started**
   - How to place an order
   - Delivery windows explained
   - Payment methods
   - Service area

2. **During Shopping**
   - Adding items after submission ($0.10 fee)
   - Replacement approvals
   - Communicating with shopper
   - Cancellation policy

3. **Delivery**
   - What is a delivery PIN?
   - What if I'm not home?
   - Delivery instructions
   - Safe delivery practices

4. **After Delivery**
   - Inspecting your order
   - Reporting missing items
   - Reporting damaged items
   - Refund timeline

5. **Billing**
   - Pre-authorization holds
   - Final charges explained
   - Late-add fees
   - Refund processing

6. **Fraud Prevention**
   - Why we need delivery PINs
   - Photo evidence requirements
   - Account security

---

### **2. Shopper/Driver Support Portal**
`/support/shopper`

#### **Features:**
- Earnings dashboard
- Active order support
- Training resources
- Issue escalation
- Card management

#### **FAQ Categories:**
1. **Getting Started**
   - How to become a shopper
   - Background check process
   - Stripe card setup
   - Insurance requirements

2. **Shopping Orders**
   - Finding items
   - Handling out-of-stock items
   - Replacement suggestions
   - Receipt scanning
   - Using your Stripe card

3. **Delivery**
   - Delivery PIN verification
   - What if customer doesn't answer?
   - Photo evidence requirements
   - Safety in unsafe areas

4. **Payments**
   - How earnings work
   - When do I get paid?
   - Card spending limits
   - Expense reimbursement

5. **Issues & Escalation**
   - Customer disputes
   - Damaged items
   - Missing items claims
   - Fraud accusations

---

### **3. Admin Support Dashboard**
`/admin/support`

#### **Features:**
- All open tickets
- Manual review queue
- Fraud investigation
- Refund approvals
- Shopper performance

---

## Support Ticket System

### **Ticket Types:**

#### **Customer Tickets:**
```typescript
type CustomerTicketType =
  | 'missing_item'
  | 'damaged_item'
  | 'wrong_item'
  | 'late_delivery'
  | 'shopper_issue'
  | 'billing_question'
  | 'refund_request'
  | 'general_inquiry'
```

#### **Shopper Tickets:**
```typescript
type ShopperTicketType =
  | 'payment_issue'
  | 'card_declined'
  | 'customer_not_responding'
  | 'unsafe_delivery_location'
  | 'order_question'
  | 'app_technical_issue'
  | 'false_fraud_claim'
```

---

## Live Chat Integration

### **Suggested: Intercom or Zendesk**

**Features Needed:**
- Real-time messaging
- Mobile app support
- Auto-routing (customer vs shopper)
- Canned responses
- Chat history
- File uploads (photo evidence)

---

## FAQ Implementation

### **Database Schema:**
```typescript
interface FAQItem {
  id: string
  category: 'customer' | 'shopper' | 'both'
  section: string // e.g., "Getting Started"
  question: string
  answer: string // Markdown supported
  tags: string[]
  helpfulCount: number
  notHelpfulCount: number
  relatedArticles: string[] // Array of FAQ IDs
  lastUpdated: Date
  priority: number // For ordering
}
```

### **Search Features:**
- Full-text search
- Tag filtering
- "Was this helpful?" feedback
- Related articles suggestions
- Popular questions

---

## Escalation Process

### **Customer Issue → Manual Review:**
```
1. Customer reports issue
2. Automated checks:
   - Photo evidence provided?
   - Within 24hr window?
   - Fraud score acceptable?
3. If auto-approved → Refund issued
4. If flagged → Manual review queue
5. Admin reviews:
   - Order history
   - Photo evidence
   - Receipt comparison
   - Shopper notes
6. Approve/Deny with notes
7. Notify customer
```

### **Shopper Issue → Support:**
```
1. Shopper reports issue
2. Immediate response options:
   - PIN not working → "Call customer" button
   - Unsafe location → "Cancel delivery" option
   - Customer not home → "Leave at door" + photo
3. If unresolved → Create ticket
4. Support team responds within 15 min
```

---

## Priority Levels

### **Customer Issues:**
- 🔴 **Critical**: Order not delivered, payment issue
- 🟠 **High**: Missing items, damaged items
- 🟡 **Medium**: Refund questions, late delivery
- 🟢 **Low**: General questions, feedback

### **Shopper Issues:**
- 🔴 **Critical**: Card declined, unsafe situation
- 🟠 **High**: Customer not responding, order confusion
- 🟡 **Medium**: App issues, payment questions
- 🟢 **Low**: General questions

---

## SLA (Service Level Agreement)

### **Response Times:**
- Critical: 15 minutes
- High: 1 hour
- Medium: 4 hours
- Low: 24 hours

### **Resolution Times:**
- Critical: 2 hours
- High: 24 hours
- Medium: 48 hours
- Low: 72 hours

---

## Self-Service Tools

### **Customer Portal:**
- ✅ Track order in real-time
- ✅ View/retrieve delivery PIN
- ✅ Report missing items (with photo upload)
- ✅ Request refund (automated for small amounts)
- ✅ Update delivery instructions
- ✅ Reschedule delivery

### **Shopper Portal:**
- ✅ Call customer (in-app)
- ✅ Report unsafe situation
- ✅ Mark item unavailable
- ✅ Upload receipt photo
- ✅ View earnings breakdown
- ✅ Dispute false fraud claim

---

## Common Scenarios & Solutions

### **Scenario 1: Customer not home for delivery**
**Shopper Action:**
1. Call customer via app
2. Text delivery PIN request
3. If no response after 10 min:
   - Leave at door (safe location)
   - Take photo evidence
   - Mark "Left at door - no PIN"
4. Customer can retrieve PIN from app later

### **Scenario 2: Customer claims missing items**
**Automated Flow:**
1. Customer uploads photo of delivered items
2. System compares to receipt photo
3. If items clearly missing → Auto-refund (up to $20)
4. If unclear → Manual review
5. If fraud score high → Deny + explain

### **Scenario 3: Shopper's card declined**
**Shopper Action:**
1. System alerts: "Card declined - contact support"
2. Live chat with support
3. Support checks:
   - Card spending limit
   - Order amount vs limit
   - Card active status
4. Increase limit or re-activate card
5. Shopper retries transaction

---

## Analytics & Monitoring

### **Track:**
- Average response time
- Resolution rate
- Customer satisfaction score
- Top FAQ articles
- Common issues
- Fraud claim patterns
- Shopper complaint trends

---

## Implementation Priority

1. ✅ **FAQ Database & Search**
2. ✅ **Customer Support Portal**
3. ✅ **Shopper Support Portal**
4. ⏳ **Live Chat Integration**
5. ⏳ **Ticket System**
6. ⏳ **Admin Dashboard**
7. ⏳ **Analytics**

---

## Recommended Tools

**Live Chat:** Intercom, Zendesk Chat
**Knowledge Base:** Intercom Articles, HelpScout Docs
**Ticketing:** Zendesk, Freshdesk
**Phone Support:** Twilio
**Analytics:** Mixpanel, Amplitude

Would you like me to implement any specific portal?
