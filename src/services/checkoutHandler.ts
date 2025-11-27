import Stripe from 'stripe'
import { stripe } from './stripe'
import { createOrder, getOrderByStripeSessionId } from './orders'
import { Order, OrderItem } from '../types/orderValidation'
import { generateOrderNumber } from '../utils/orderHelpers'
import { calculateOrderItemTotals, calculateOrderTotals, generateOrderId } from '../utils/orderHelpers'
import logger from '../common/logger'

export async function handleCheckoutSessionCompleted(session: {
  id: string
  payment_intent?: string | null
  customer_email?: string | null
  metadata: {
    userId: string
    orderItemCount?: string
    cartItems?: string
  }
}): Promise<void> {
  try {
    // Check for idempotency - prevent duplicate order creation
    const existingOrder = await getOrderByStripeSessionId(session.id)
    if (existingOrder) {
      logger.info({ sessionId: session.id, orderId: existingOrder.id }, 'Order already exists for this session')
      return
    }
    // Thanks to this expand parameter, line items and product details are included
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price.product'],
    })

    const lineItems = fullSession.line_items?.data || []

    if (lineItems.length === 0) {
      throw new Error('No line items found in checkout session')
    }

    // Build order items from Stripe line items
    const orderItems: OrderItem[] = []

    for (const item of lineItems) {
      const price = item.price
      const product = price?.product as Stripe.Product

      if (!product || !price) {
        logger.warn({ itemId: item.id }, 'Skipping line item without product or price')
        continue
      }

      const productId = product.metadata?.productId
      const taxRate = price.metadata?.taxRate || '1.0'

      if (!productId) {
        logger.warn({ stripeProductId: product.id }, 'Product missing productId in metadata')
        continue
      }

      // (amount is in cents)
      const priceAmount = (price.unit_amount || 0) / 100
      const currency = price.currency.toUpperCase()

      const discountRate = product.metadata?.discountRate ? parseFloat(product.metadata.discountRate) : 0

      const quantity = item.quantity || 1

      const totals = calculateOrderItemTotals({
        price: { amount: priceAmount },
        quantity,
        discount: discountRate > 0 ? { rate: discountRate } : null,
        taxRate,
      })

      const orderItem: OrderItem = {
        productId,
        title: product.name,
        brand: product.metadata?.brand || 'Unknown',
        price: {
          amount: priceAmount,
          currency,
        },
        discount: discountRate > 0 ? { rate: discountRate } : null,
        size: item.description || undefined,
        quantity,
        image: product.images[0] || '',
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      }

      orderItems.push(orderItem)
    }

    if (orderItems.length === 0) {
      throw new Error('No valid order items could be created from line items')
    }

    const currency = orderItems[0].price.currency
    const orderTotals = calculateOrderTotals(orderItems, currency)

    const paidAmount = (fullSession.amount_total || 0) / 100
    const calculatedTotal = orderTotals.total

    if (Math.abs(paidAmount - calculatedTotal) > 0.01) {
      logger.warn(
        {
          paidAmount,
          calculatedTotal,
          difference: paidAmount - calculatedTotal,
        },
        'Payment amount mismatch - possible rounding difference',
      )
    }

    const customerInfo = {
      email: session.customer_email || fullSession.customer_details?.email || '',
      name: fullSession.customer_details?.name || undefined,
      phone: fullSession.customer_details?.phone || undefined,
      address: fullSession.customer_details?.address
        ? {
            line1: fullSession.customer_details.address.line1 || '',
            line2: fullSession.customer_details.address.line2 || undefined,
            city: fullSession.customer_details.address.city || '',
            postalCode: fullSession.customer_details.address.postal_code || '',
            country: fullSession.customer_details.address.country || '',
          }
        : undefined,
    }

    const orderNumber = generateOrderNumber()
    const orderId = generateOrderId()
    const now = new Date().toISOString()

    const order: Order = {
      id: orderId,
      userId: session.metadata.userId,
      orderNumber,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || '',
      status: 'processing',
      items: orderItems,
      totals: orderTotals,
      customerInfo,
      createdAt: now,
      updatedAt: now,
      paymentCompletedAt: now,
    }

    await createOrder(order)

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        total: orderTotals.total,
        currency: orderTotals.currency,
        itemCount: orderItems.length,
      },
      'Checkout session processed successfully',
    )
  } catch (error) {
    logger.error({ err: error, sessionId: session.id }, 'Failed to handle checkout session')
    throw error
  }
}
