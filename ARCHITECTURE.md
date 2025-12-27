# TextileCom Express - System Architecture & Technical Design

> Deep dive into architectural decisions, design patterns, and implementation trade-offs for the webhook microservice

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Design Decisions & Rationale](#design-decisions--rationale)
4. [Request Lifecycle](#request-lifecycle)
5. [Data Architecture](#data-architecture)
6. [Integration Points](#integration-points)
7. [Error Handling Philosophy](#error-handling-philosophy)
8. [Security Model](#security-model)
9. [Performance Considerations](#performance-considerations)
10. [Scalability & Future Enhancements](#scalability--future-enhancements)

---

## System Overview

TextileCom Express is a **serverless webhook microservice** built to handle the critical post-payment workflow for the TextileCom e-commerce platform. It demonstrates a **separation of concerns** architecture where payment processing logic is isolated from the frontend application.

### Core Principles

1. **Serverless-First** - Designed for Vercel's serverless environment with stateless request handling
2. **Event-Driven** - Reacts to Stripe webhook events rather than providing REST APIs
3. **Transaction Safety** - Ensures atomic operations across distributed data stores
4. **Idempotency** - Handles duplicate webhook events gracefully
5. **Fail-Safe Design** - Critical operations succeed even when non-critical services fail

### Why Microservice Architecture?

**Separation from Next.js Frontend:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monolithic Alternative                       │
│  ❌ Problems if webhook handler was in Next.js frontend:       │
│                                                                 │
│  1. Security Risk - Payment secrets exposed to frontend build  │
│  2. Coupling - Payment logic mixed with UI concerns            │
│  3. Deployment - Frontend changes force webhook redeployment   │
│  4. Scaling - UI traffic affects payment processing capacity   │
│  5. Testing - Harder to isolate and test payment logic         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Microservice Architecture                       │
│  ✅ Benefits of separate webhook service:                      │
│                                                                 │
│  1. Security - Webhook secrets isolated from client code       │
│  2. Independence - Deploy webhook logic without frontend       │
│  3. Scalability - Scale webhook processing independently       │
│  4. Reliability - Webhook failures don't crash frontend        │
│  5. Maintainability - Clear boundaries between concerns        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TextileCom E-Commerce Platform                   │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│  Customer Browser    │         │   Stripe Platform    │
│  (Next.js Frontend)  │         │   (Payment Gateway)  │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                 │
           │ 1. Create Checkout Session     │
           │────────────────────────────────>│
           │                                 │
           │ 2. Redirect to Checkout        │
           │<────────────────────────────────│
           │                                 │
           │ 3. Customer Pays               │
           │────────────────────────────────>│
           │                                 │
           │ 4. Redirect to Success Page    │
           │<────────────────────────────────│
           │                                 │
           │                                 │ 5. Webhook Event
           │                                 │    (async)
           │                                 ▼
           │                     ┌───────────────────────┐
           │                     │  TextileCom Express   │
           │                     │  (This Microservice)  │
           │                     └───────────┬───────────┘
           │                                 │
           │                                 │ 6. Process Order
           │                                 ▼
           │                     ┌───────────────────────┐
           │                     │  Firebase Firestore   │
           │                     │  (Shared Database)    │
           │                     └───────────┬───────────┘
           │                                 │
           │ 7. Real-time Order Updates     │
           │<────────────────────────────────┘
           │
           │ 8. View Order Confirmation
           │
           ▼
```

### Data Flow Sequence

```
┌─────────┐     ┌────────┐     ┌──────────────┐     ┌──────────┐     ┌────────┐
│ Frontend│     │ Stripe │     │   Webhook    │     │ Firestore│     │ Resend │
│         │     │        │     │  Microservice│     │          │     │        │
└────┬────┘     └───┬────┘     └──────┬───────┘     └────┬─────┘     └───┬────┘
     │              │                  │                  │               │
     │ Create       │                  │                  │               │
     │ Session      │                  │                  │               │
     │─────────────>│                  │                  │               │
     │              │                  │                  │               │
     │ Session ID   │                  │                  │               │
     │<─────────────│                  │                  │               │
     │              │                  │                  │               │
     │ Redirect to  │                  │                  │               │
     │ Checkout     │                  │                  │               │
     │─────────────>│                  │                  │               │
     │              │                  │                  │               │
     │   Customer Pays on Stripe UI    │                  │               │
     │              │                  │                  │               │
     │              │ checkout.session.completed          │               │
     │              │─────────────────>│                  │               │
     │              │                  │                  │               │
     │              │                  │ Verify Signature │               │
     │              │                  │──────────┐       │               │
     │              │                  │          │       │               │
     │              │                  │<─────────┘       │               │
     │              │                  │                  │               │
     │              │                  │ Check Idempotency│               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ No existing order│               │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │ Expand line items│                  │               │
     │              │<─────────────────│                  │               │
     │              │                  │                  │               │
     │              │ Line items data  │                  │               │
     │              │─────────────────>│                  │               │
     │              │                  │                  │               │
     │              │                  │ Fetch cart items │               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ Cart data (sizes)│               │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │                  │ Get order counter│               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ Counter (TX)     │               │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │                  │ Create order     │               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ Order created    │               │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │                  │ Decrement stock  │               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ Stock updated (TX)│              │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │                  │ Delete cart      │               │
     │              │                  │─────────────────>│               │
     │              │                  │                  │               │
     │              │                  │ Cart deleted     │               │
     │              │                  │<─────────────────│               │
     │              │                  │                  │               │
     │              │                  │ Send email       │               │
     │              │                  │─────────────────────────────────>│
     │              │                  │                  │               │
     │              │                  │ Email sent       │               │
     │              │                  │<─────────────────────────────────│
     │              │                  │                  │               │
     │              │ 200 OK           │                  │               │
     │              │<─────────────────│                  │               │
     │              │                  │                  │               │
     │ Poll orders  │                  │                  │               │
     │─────────────────────────────────────────────────>│               │
     │              │                  │                  │               │
     │ New order data│                  │                 │               │
     │<─────────────────────────────────────────────────│               │
     │              │                  │                  │               │
```

---

## Design Decisions & Rationale

### 1. Webhook-Driven vs REST API

**Decision:** Use webhook events rather than REST endpoints for order creation.

**Rationale:**

| Approach              | Pros                                                                                                                                                              | Cons                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Webhook-Driven** ✅ | - Stripe is source of truth<br>- No client-side order creation<br>- Payment always verified<br>- Resilient to network failures<br>- Automatic retries from Stripe | - Requires public endpoint<br>- Async (no immediate response)<br>- Must handle duplicates                                      |
| **REST API** ❌       | - Synchronous<br>- Immediate response<br>- Client has control                                                                                                     | - Client can call without payment<br>- Race conditions possible<br>- Payment verification required<br>- Complex error handling |

**Why Webhooks Win:**

```typescript
// ❌ REST API approach (risky):
// Client: "I paid! Create my order!"
// Backend: "Did you really? Let me verify..."
// Problem: What if client lies? What if network fails before verification?

// ✅ Webhook approach (secure):
// Stripe: "Payment completed with signature proof"
// Backend: "Signature valid? Create order."
// Client: "Let me check if my order exists yet"
```

**Trade-off Accepted:** Slight delay (1-2 seconds) between payment and order creation, but guaranteed accuracy.

---

### 2. Firestore Transactions for Stock Management

**Decision:** Use Firestore transactions for all stock decrements.

**Problem Statement:**

```typescript
// ❌ Without transactions (RACE CONDITION):
// Thread A: Read stock = 1
// Thread B: Read stock = 1
// Thread A: Decrement stock to 0
// Thread B: Decrement stock to 0  // ❌ Oversold! Stock should be -1
```

**Solution with Transactions:**

```typescript
// ✅ With transactions (SAFE):
await db.runTransaction(async (transaction) => {
  const productDoc = await transaction.get(productRef)
  const currentStock = productDoc.data().stock

  if (currentStock < quantity) {
    throw new Error('Insufficient stock') // Transaction aborts
  }

  transaction.update(productRef, {
    stock: currentStock - quantity, // Atomic decrement
  })
})
```

**Firestore Transaction Guarantees:**

- **Atomicity** - All operations succeed or all fail
- **Consistency** - Stock never goes negative
- **Isolation** - Concurrent transactions are serialized
- **Durability** - Once committed, changes persist

**Performance Cost:** ~50-100ms per transaction (acceptable for order processing).

---

### 3. Idempotency with Session ID Lookup

**Decision:** Check for existing orders by `stripeSessionId` before creating new ones.

**Why Needed:**

Stripe retries failed webhooks with exponential backoff:

```
First attempt:   Immediate
Retry 1:         5 minutes later
Retry 2:         30 minutes later
Retry 3:         2 hours later
...up to 3 days
```

**Without Idempotency:**

```typescript
// ❌
async function handleCheckout(session) {
  await createOrder(session) // Called 4 times = 4 duplicate orders! 😱
  await decrementStock() // Stock decremented 4 times! 🚨
  await sendEmail() // Customer gets 4 emails! 📧📧📧📧
}
```

**With Idempotency:**

```typescript
// ✅ Idempotent approach:
async function handleCheckout(session) {
  const existingOrder = await getOrderByStripeSessionId(session.id)

  if (existingOrder) {
    logger.info('Order already exists, skipping')
    return // Exit early, still return 200 OK to Stripe
  }

  // Only create order if it doesn't exist
  await createOrder(session)
  await decrementStock()
  await sendEmail()
}
```

**Alternative Considered:** Using Stripe's `idempotency_key` header.

**Why Session ID is Better:**

- Session ID is unique per checkout
- Persists in Firestore (survives restarts)
- No need to generate and store separate keys

---

### 4. Graceful Degradation for Email Service

**Decision:** Email failures are logged but don't block order creation.

**Philosophy:**

```
Critical Path:     Non-Critical Path:
Payment ✅         Email ✅ (nice to have)
Order Creation ✅  Logging ✅
Stock Update ✅    Metrics ✅
Cart Cleanup ✅
```

**Implementation:**

```typescript
try {
  // Critical operations (must succeed)
  await createOrder(orderData)
  await decrementStock(items)
  await deleteCart(userId)

  // Non-critical operation (can fail)
  try {
    await sendOrderConfirmationEmail(order)
  } catch (emailError) {
    logger.error({ orderId, emailError }, 'Email failed, but order created')
    // Continue execution - order is still valid! ✅
  }

  return res.status(200).json({ success: true })
} catch (criticalError) {
  // Critical failure - rollback if possible
  logger.error({ criticalError }, 'Order creation failed')
  return res.status(500).json({ error: 'Order processing failed' })
}
```

**Recovery Strategy:**

- Failed emails are logged with `orderId`
- Admin dashboard can show orders without confirmation emails
- Batch retry job can resend emails later
- Customer support can manually trigger email

**Trade-off:** Some customers might not receive immediate confirmation, but their order is guaranteed to exist.

---

### 5. Sequential Order Numbers with Firestore Counter

**Decision:** Use transaction-based counter for human-friendly order numbers.

**Format:** `ORD-000001-A1B2C3D4`

- `ORD` - Prefix
- `000001` - Sequential counter (padded to 6 digits)
- `A1B2C3D4` - Random suffix from order UUID (first 8 chars)

**Why Not Just Use UUIDs?**

| Approach             | Example                                | Pros                             | Cons                                        |
| -------------------- | -------------------------------------- | -------------------------------- | ------------------------------------------- |
| **UUID Only**        | `550e8400-e29b-41d4-a716-446655440000` | Unique, no transaction needed    | Not human-friendly, hard to read over phone |
| **Auto-increment**   | `12345`                                | Simple, short                    | Race conditions, hard to shard              |
| **Hybrid (ours)** ✅ | `ORD-000042-A1B2C3D4`                  | Human-friendly, unique, sortable | Requires transaction                        |

**Implementation:**

```typescript
// Counter document in Firestore: /counters/orderCounter
export async function getNextOrderCounter(): Promise<number> {
  const db = getDb()
  const counterRef = db.collection('counters').doc('orderCounter')

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef)

    if (!counterDoc.exists) {
      // First order ever
      transaction.set(counterRef, { value: 1 })
      return 1
    }

    const newValue = counterDoc.data().value + 1
    transaction.update(counterRef, { value: newValue })
    return newValue
  })
}
```

**Why Transaction is Critical:**

```
Without transaction:
Thread A reads counter = 42
Thread B reads counter = 42
Thread A writes counter = 43
Thread B writes counter = 43  // ❌ Duplicate order number!

With transaction:
Thread A locks, reads 42, writes 43, unlocks
Thread B waits...
Thread B locks, reads 43, writes 44, unlocks  // ✅ Unique numbers
```

---

### 6. Payment Amount Validation

**Decision:** Cross-check Stripe's `amount_total` against calculated order totals.

**Why Needed:**

Prevents price manipulation attacks:

```typescript
// Malicious scenario:
// 1. User inspects frontend code
// 2. Finds Stripe Checkout creation endpoint
// 3. Modifies price before sending to Stripe
// 4. Pays $1 for a $100 product
```

**Validation Logic:**

```typescript
const stripeAmount = session.amount_total // Amount Stripe actually charged
const calculatedTotal = calculateOrderTotals(items).total // Expected amount

const difference = Math.abs(stripeAmount - calculatedTotal)

if (difference > 1) {
  // Allow 1 cent rounding error
  logger.warn(
    {
      stripeAmount,
      calculatedTotal,
      difference,
      sessionId: session.id,
    },
    'Payment amount mismatch detected',
  )

  // CRITICAL: Use Stripe amount as source of truth
  // Customer paid stripeAmount, so honor that payment
}
```

**Why Use Stripe Amount as Source of Truth:**

- Customer's card was actually charged `stripeAmount`
- Refunding would require manual intervention
- Price might have changed between cart creation and payment
- Stripe is the authoritative payment processor

**Alert Strategy:**

- Log warning for manual review
- Flag order for admin review if difference > threshold

---

## Request Lifecycle

### Complete Webhook Processing Flow

```typescript
// src/resources/stripe/webhooks/controller.ts
export async function receiveUpdates(req: Request, res: Response) {
  const requestId = req.id // UUID from middleware

  try {
    // ═══════════════════════════════════════════════════════════
    // PHASE 1: Signature Verification (Security)
    // ═══════════════════════════════════════════════════════════
    const signature = req.headers['stripe-signature']
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' })
    }

    const event = stripe.webhooks.constructEvent(
      req.body, // Raw body (not parsed JSON!)
      signature, // HMAC signature from header
      STRIPE_WEBHOOK_SIGNING_SECRET, // Shared secret
    )
    // constructEvent throws if signature invalid or timestamp > 5min old

    logger.info({ requestId, eventType: event.type }, 'Webhook received')

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: Event Routing (Event-Driven Architecture)
    // ═══════════════════════════════════════════════════════════
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment successful - create order
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session)
        break

      case 'checkout.session.expired':
        // Abandoned cart - send recovery email
        const expiredSession = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionExpired(expiredSession)
        break

      default:
        // Unknown event type
        logger.info({ eventType: event.type }, 'Unhandled event type')
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: Acknowledge Receipt (CRITICAL!)
    // ═══════════════════════════════════════════════════════════
    // ALWAYS return 200 OK to Stripe within 30 seconds
    // Otherwise Stripe treats it as failed and retries
    return res.status(200).json({
      received: true,
      processed: true,
      requestId,
    })
  } catch (error) {
    logger.error({ requestId, error }, 'Webhook processing failed')

    // Still return 200 for validation errors to prevent retries
    if (error.message.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    return res.status(200).json({
      received: true,
      processed: false, // Logged for investigation
      requestId,
    })
  }
}
```

### Detailed Order Creation Flow

```typescript
// src/services/checkoutHandler.ts
export async function handleCheckoutSessionCompleted(session: StripeCheckoutSession): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // Step 1: Idempotency Check
  // ─────────────────────────────────────────────────────────────
  const existingOrder = await getOrderByStripeSessionId(session.id)
  if (existingOrder) {
    logger.info({ sessionId: session.id }, 'Order already exists')
    return // Exit early - this is a retry
  }

  // ─────────────────────────────────────────────────────────────
  // Step 2: Fetch Full Session Data from Stripe
  // ─────────────────────────────────────────────────────────────
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price.product'], // Get product details
  })

  const lineItems = fullSession.line_items?.data || []

  // ─────────────────────────────────────────────────────────────
  // Step 3: Fetch Cart Items for Size Information
  // ─────────────────────────────────────────────────────────────
  // Stripe doesn't store size variants, so fetch from Firestore
  const checkoutSessionDoc = await db.collection('checkout_sessions').doc(session.metadata.checkoutSessionId).get()

  const cartItems = checkoutSessionDoc.data()?.items || []

  // Create lookup map: stripePriceId → size
  const sizeMap = new Map()
  cartItems.forEach((item) => {
    sizeMap.set(item.stripePriceId, item.size)
  })

  // ─────────────────────────────────────────────────────────────
  // Step 4: Build Order Items from Stripe Line Items
  // ─────────────────────────────────────────────────────────────
  const orderItems = lineItems.map((lineItem) => {
    const product = lineItem.price.product as Stripe.Product
    const stripePriceId = lineItem.price.id
    const size = sizeMap.get(stripePriceId) // Get size from cart

    return {
      productId: product.metadata.productId,
      title: product.name,
      brand: product.metadata.brand,
      price: {
        amount: lineItem.price.unit_amount / 100, // Convert cents
        currency: lineItem.price.currency,
      },
      quantity: lineItem.quantity,
      size: size, // From cart, not from Stripe!
      image: product.images[0],
      taxRate: product.metadata.taxRate,
      discount: product.metadata.discount
        ? {
            rate: parseFloat(product.metadata.discount),
          }
        : null,
      // Calculate totals
      ...calculateOrderItemTotals({
        price: lineItem.price.unit_amount / 100,
        quantity: lineItem.quantity,
        discount: product.metadata.discount,
        taxRate: product.metadata.taxRate,
      }),
    }
  })

  // ─────────────────────────────────────────────────────────────
  // Step 5: Validate Payment Amount
  // ─────────────────────────────────────────────────────────────
  const stripeAmount = session.amount_total / 100
  const calculatedTotals = calculateOrderTotals(orderItems, session.currency)

  if (Math.abs(stripeAmount - calculatedTotals.total) > 1) {
    logger.warn({ stripeAmount, calculated: calculatedTotals.total }, 'Payment amount mismatch')
  }

  // ─────────────────────────────────────────────────────────────
  // Step 6: Extract Customer Information
  // ─────────────────────────────────────────────────────────────
  const customerInfo = {
    email: session.customer_email,
    name: session.customer_details?.name,
    phone: session.customer_details?.phone,
    address: session.shipping_details?.address
      ? {
          line1: session.shipping_details.address.line1,
          city: session.shipping_details.address.city,
          postalCode: session.shipping_details.address.postal_code,
          country: session.shipping_details.address.country,
        }
      : undefined,
  }

  // ─────────────────────────────────────────────────────────────
  // Step 7: Generate Order Number (Transaction-Safe)
  // ─────────────────────────────────────────────────────────────
  const counter = await getNextOrderCounter() // Firestore transaction
  const orderId = generateOrderId() // UUID
  const orderNumber = generateOrderNumber(counter) // ORD-000042-...

  // ─────────────────────────────────────────────────────────────
  // Step 8: Create Order in Firestore
  // ─────────────────────────────────────────────────────────────
  const order = {
    id: orderId,
    orderNumber,
    userId: session.metadata.userId,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    status: 'completed',
    items: orderItems,
    totals: calculatedTotals,
    customerInfo,
    createdAt: new Date().toISOString(),
    paymentCompletedAt: new Date().toISOString(),
  }

  await createOrder(order)

  // ─────────────────────────────────────────────────────────────
  // Step 9: Decrement Product Stock (Atomic Transaction)
  // ─────────────────────────────────────────────────────────────
  await decrementMultipleProductsStock(orderItems)

  // ─────────────────────────────────────────────────────────────
  // Step 10: Clear User's Cart
  // ─────────────────────────────────────────────────────────────
  await deleteCart(session.metadata.userId)

  // ─────────────────────────────────────────────────────────────
  // Step 11: Send Order Confirmation Email (Non-Blocking)
  // ─────────────────────────────────────────────────────────────
  try {
    await sendOrderConfirmationEmail({ order })
  } catch (emailError) {
    // Log but don't throw - order is still valid!
    logger.error({ orderId, emailError }, 'Email failed')
  }

  logger.info({ orderId, orderNumber }, 'Order created successfully')
}
```

---

**Data Fetching:**

```typescript
// Expand nested resources to reduce API calls
const session = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: [
    'line_items', // Include line items
    'line_items.data.price.product', // Include product details
  ],
})

// Without expand: 1 + N API calls (N = number of line items)
// With expand: 1 API call total
```

---

## Error Handling Philosophy

### Error Categories

```typescript
// Category 1: CRITICAL ERRORS (must be fixed immediately)
// - Payment received but order not created
// - Stock not decremented (overselling risk)
// - Cart not cleared (customer confusion)
// Response: Return 500, Stripe will retry, trigger alerts

// Category 2: VALIDATION ERRORS (bad request)
// - Invalid webhook signature
// - Missing required fields
// - Malformed data
// Response: Return 400, log for investigation, don't retry

// Category 3: NON-CRITICAL ERRORS (degraded service)
// - Email send failed
// - Logging failed
// - Metrics upload failed
// Response: Log warning, continue execution, return 200
```

### Error Handling Implementation

```typescript
// src/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.id

  // Log full error server-side
  logger.error(
    {
      requestId,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      body: req.body,
      headers: req.headers,
    },
    'Request error',
  )

  // Return sanitized error to client
  if (process.env.NODE_ENV === 'production') {
    // Production: Hide details
    res.status(500).json({
      error: 'Internal Server Error',
      requestId, // For support requests
    })
  } else {
    // Development: Show details
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      requestId,
    })
  }
}
```

### Structured Logging

```typescript
// src/common/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
})

// Usage:
logger.info({ userId, orderId }, 'Order created')
logger.error({ orderId, error }, 'Stock decrement failed')
logger.warn({ stripeAmount, calculated }, 'Amount mismatch')
```

---

### Optimization Strategies

**1. Batch Operations:**

```typescript
// ✅ Batch stock updates
await decrementMultipleProductsStock([
  { productId: 'p1', quantity: 2 },
  { productId: 'p2', quantity: 1 },
])

// ❌
for (const item of items) {
  await decrementStock(item.productId, item.quantity)
}
```

**2. Firestore Expand (Stripe):**

```typescript
// ✅ Single API call with expand
const session = await stripe.checkout.sessions.retrieve(id, {
  expand: ['line_items.data.price.product'],
})

// ❌ 1 + N API calls
const session = await stripe.checkout.sessions.retrieve(id)
const lineItems = await stripe.checkout.sessions.listLineItems(id)
for (const item of lineItems) {
  const product = await stripe.products.retrieve(item.price.product)
}
```

**3. Non-Blocking Email:**

```typescript
// ✅ Don't await email (fire and forget)
sendOrderConfirmationEmail(order).catch((error) => {
  logger.error({ error }, 'Email failed')
})

// ❌ Block on email send
await sendOrderConfirmationEmail(order)
```

---

## Conclusion

This microservice architecture demonstrates production-grade engineering practices:

- **Reliability:** Idempotency, transactions, graceful degradation
- **Security:** Signature verification, secret management, input validation
- **Performance:** Sub-second response times, efficient database operations
- **Maintainability:** Clear separation of concerns, comprehensive logging, type safety
- **Scalability:** Serverless deployment, horizontal scaling, optimization opportunities

The design trade-offs prioritize **correctness over speed** and **resilience over complexity**, making it suitable for a production e-commerce platform handling real payments.

---

**For implementation details, see:**

- [README.md](./README.md) - Getting started and features
