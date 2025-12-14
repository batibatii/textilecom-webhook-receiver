import Stripe from 'stripe'
import { stripe } from './stripe'
import { createOrder, getOrderByStripeSessionId } from './orders'
import { Order, OrderItem, CustomerInfo } from '../types/orderValidation'
import type { StripeCheckoutSession } from '../types/stripeValidation'
import { generateOrderNumber } from '../utils/orderHelpers'
import { calculateOrderItemTotals, calculateOrderTotals, generateOrderId } from '../utils/orderHelpers'
import { decrementMultipleProductsStock } from './products'
import { deleteCart } from './cart'
import { sendOrderConfirmationEmail } from './email/templates/orderConfirmation'
import logger from '../common/logger'

export async function handleCheckoutSessionCompleted(session: StripeCheckoutSession): Promise<void> {
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

    // Parse cart items from session metadata to get size information
    let cartItemsMap: Map<string, { size?: string }> = new Map()
    if (session.metadata.cartItems) {
      try {
        const cartItems = JSON.parse(session.metadata.cartItems)
        cartItems.forEach((item: { productId: string; size?: string; stripePriceId: string }) => {
          cartItemsMap.set(item.stripePriceId, { size: item.size })
        })
      } catch (error) {
        logger.warn({ error }, 'Failed to parse cartItems from session metadata')
      }
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

      // Get size from cart items metadata
      const cartItemData = cartItemsMap.get(price.id)
      const size = cartItemData?.size || 'One size'

      const orderItem: OrderItem = {
        productId,
        title: product.name,
        brand: product.metadata?.brand || 'Unknown',
        price: {
          amount: priceAmount,
          currency,
        },
        discount: discountRate > 0 ? { rate: discountRate } : null,
        size,
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

    const customerInfo: CustomerInfo = {
      email: session.customer_email || fullSession.customer_details?.email || '',
    }

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (fullSession.customer_details?.name) {
      customerInfo.name = fullSession.customer_details.name
    }

    if (fullSession.customer_details?.phone) {
      customerInfo.phone = fullSession.customer_details.phone
    }

    // Only add address if all required fields are present
    if (
      fullSession.customer_details?.address &&
      fullSession.customer_details.address.line1 &&
      fullSession.customer_details.address.city &&
      fullSession.customer_details.address.postal_code &&
      fullSession.customer_details.address.country
    ) {
      customerInfo.address = {
        line1: fullSession.customer_details.address.line1,
        city: fullSession.customer_details.address.city,
        postalCode: fullSession.customer_details.address.postal_code,
        country: fullSession.customer_details.address.country,
      }

      // Only add line2 if it exists
      if (fullSession.customer_details.address.line2) {
        customerInfo.address.line2 = fullSession.customer_details.address.line2
      }
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

    const stockUpdates = orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))

    await decrementMultipleProductsStock(stockUpdates)

    await deleteCart(session.metadata.userId)

    try {
      await sendOrderConfirmationEmail({ order })
      logger.info({ orderId: order.id, email: order.customerInfo.email }, 'Order confirmation email sent successfully')
    } catch (emailError) {
      // Log error but don't fail the order creation
      logger.error(
        { err: emailError, orderId: order.id, email: order.customerInfo.email },
        'Failed to send order confirmation email',
      )
    }

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        total: orderTotals.total,
        currency: orderTotals.currency,
        itemCount: orderItems.length,
      },
      'Checkout session processed successfully - order created, stock decremented, cart cleared, and email sent',
    )
  } catch (error) {
    logger.error({ err: error, sessionId: session.id }, 'Failed to handle checkout session')
    throw error
  }
}
