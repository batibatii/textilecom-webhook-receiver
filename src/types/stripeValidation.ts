import { z } from 'zod'

export const StripeCheckoutSessionSchema = z.object({
  id: z.string(), // Session ID
  object: z.literal('checkout.session'),
  amount_total: z.number().nullable(), // Total amount in cents
  currency: z.string().optional(),
  customer_email: z.string().email().optional().nullable(),
  payment_intent: z.string().optional().nullable(), // Payment Intent ID
  payment_status: z.string(),
  metadata: z.object({
    userId: z.string(),
    orderItemCount: z.string().optional(),
    cartItems: z.string().optional(), // JSON stringified cart items (deprecated - use checkoutSessionId)
    checkoutSessionId: z.string().optional(), // Firestore document ID for checkout session data
  }),
})

export const StripeWebhookEventSchema = z.object({
  id: z.string(), // Event ID (e.g., evt_1234)
  type: z.string(), // Event type (e.g., checkout.session.completed)
  data: z.object({
    object: z.any(), // The actual object (session, payment_intent, etc.)
  }),
  created: z.number(), // Unix timestamp
})

export const CartItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  discount: z
    .object({
      rate: z.number(),
    })
    .nullable(),
  size: z.string().optional(),
  quantity: z.number().int().positive(),
  image: z.string(),
  stripePriceId: z.string(),
  taxRate: z.string(),
})

export type StripeCheckoutSession = z.infer<typeof StripeCheckoutSessionSchema>
export type StripeWebhookEvent = z.infer<typeof StripeWebhookEventSchema>
export type CartItem = z.infer<typeof CartItemSchema>
