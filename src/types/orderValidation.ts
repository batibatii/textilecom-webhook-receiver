import { z } from 'zod'

/**
 * Order Item Schema
 * Represents a single product in an order with pricing calculations
 */
export const OrderItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3), // USD, EUR, TRY
  }),
  discount: z
    .object({
      rate: z.number().min(0).max(100), // Percentage 0-100
    })
    .nullable(),
  size: z.string().optional(),
  quantity: z.number().int().positive(),
  image: z.string().url(),
  taxRate: z.string(), // e.g., "1.2" for 20% tax
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
})

export const OrderStatusSchema = z.enum([
  'pending',
  'processing', // Payment confirmed, preparing order
  'completed',
  'failed',
  'refunded',
  'cancelled',
])

export const CustomerInfoSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
    })
    .optional(),
  billingAddress: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
    })
    .optional(),
})

export const OrderTotalsSchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string().length(3),
})

export const OrderSchema = z.object({
  id: z.string(), // Firestore document ID
  userId: z.string(), // Customer user ID
  orderNumber: z.string(),

  stripeSessionId: z.string(),
  stripePaymentIntentId: z.string(),

  status: OrderStatusSchema,

  items: z.array(OrderItemSchema).min(1, 'Order must have at least 1 item'),

  totals: OrderTotalsSchema,

  // Customer information (cached from Stripe session)
  customerInfo: CustomerInfoSchema,

  createdAt: z.string(),
  updatedAt: z.string(),
  paymentCompletedAt: z.string().optional(),

  metadata: z.record(z.string(), z.string()).optional(),
})

export type OrderItem = z.infer<typeof OrderItemSchema>
export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>
export type OrderTotals = z.infer<typeof OrderTotalsSchema>
export type Order = z.infer<typeof OrderSchema>
