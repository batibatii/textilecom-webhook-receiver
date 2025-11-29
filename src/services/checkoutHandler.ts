import Stripe from 'stripe'
import { stripe } from './stripe'
import { createOrder, getOrderByStripeSessionId } from './orders'
import { Order, OrderItem } from '../types/orderValidation'
import { generateOrderNumber } from '../utils/orderHelpers'
import { calculateOrderItemTotals, calculateOrderTotals, generateOrderId } from '../utils/orderHelpers'
import { decrementMultipleProductsStock } from './products'
import { deleteCart } from './cart'
import { sendOrderConfirmationEmail } from './email/templates/orderConfirmation'
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
    logger.info({ sessionId: session.id, userId: session.metadata.userId }, 'Starting checkout session processing')

    // Check for idempotency - prevent duplicate order creation
    logger.info({ sessionId: session.id }, 'Checking for existing order')
    const existingOrder = await getOrderByStripeSessionId(session.id)
    if (existingOrder) {
      logger.info({ sessionId: session.id, orderId: existingOrder.id }, 'Order already exists for this session')
      return
    }
    logger.info({ sessionId: session.id }, 'No existing order found, proceeding with order creation')

    // Thanks to this expand parameter, line items and product details are included
    logger.info({ sessionId: session.id }, 'Retrieving full session from Stripe')
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price.product'],
    })
    logger.info({ sessionId: session.id, lineItemsCount: fullSession.line_items?.data?.length || 0 }, 'Full session retrieved')

    const lineItems = fullSession.line_items?.data || []

    if (lineItems.length === 0) {
      logger.error({ sessionId: session.id }, 'No line items found in checkout session')
      throw new Error('No line items found in checkout session')
    }

    logger.info({ sessionId: session.id, lineItemsCount: lineItems.length }, 'Processing line items')

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
      logger.error({ sessionId: session.id }, 'No valid order items could be created from line items')
      throw new Error('No valid order items could be created from line items')
    }

    logger.info({ sessionId: session.id, orderItemsCount: orderItems.length }, 'Order items built successfully')

    const currency = orderItems[0].price.currency
    const orderTotals = calculateOrderTotals(orderItems, currency)
    logger.info({ sessionId: session.id, totals: orderTotals }, 'Order totals calculated')

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

    const customerInfo: any = {
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

    logger.info({ sessionId: session.id, orderId, orderNumber }, 'Order object created, saving to Firestore')

    // Create order in Firestore
    await createOrder(order)
    logger.info({ sessionId: session.id, orderId, orderNumber }, 'Order saved to Firestore successfully')

    const stockUpdates = orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))

    logger.info({ sessionId: session.id, stockUpdates }, 'Decrementing product stock')
    await decrementMultipleProductsStock(stockUpdates)
    logger.info({ sessionId: session.id }, 'Product stock decremented successfully')

    logger.info({ sessionId: session.id, userId: session.metadata.userId }, 'Deleting cart')
    await deleteCart(session.metadata.userId)
    logger.info({ sessionId: session.id, userId: session.metadata.userId }, 'Cart deleted successfully')

    try {
      logger.info({ orderId: order.id, email: order.customerInfo.email }, 'Sending order confirmation email')
      await sendOrderConfirmationEmail({ order })
      logger.info({ orderId: order.id, email: order.customerInfo.email }, 'Order confirmation email sent successfully')
    } catch (emailError) {
      // Log error but don't fail the order creation
      logger.error({ err: emailError, orderId: order.id, email: order.customerInfo.email }, 'Failed to send order confirmation email')
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
