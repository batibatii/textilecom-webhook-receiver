import { getDb } from '../config/firebase'
import { Order } from '../types/orderValidation'
import logger from '../common/logger'

export async function createOrder(order: Order): Promise<void> {
  try {
    const db = getDb()
    const ordersRef = db.collection('orders')

    // Use order.id as the document ID
    await ordersRef.doc(order.id).set(order)

    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, 'Order created successfully in Firestore')
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, 'Failed to create order in Firestore')
    throw error
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const db = getDb()
    const orderDoc = await db.collection('orders').doc(orderId).get()

    if (!orderDoc.exists) {
      return null
    }

    return orderDoc.data() as Order
  } catch (error) {
    logger.error({ err: error, orderId }, 'Failed to get order from Firestore')
    throw error
  }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const db = getDb()
    const ordersSnapshot = await db
      .collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const orders: Order[] = []
    ordersSnapshot.forEach((doc) => {
      orders.push(doc.data() as Order)
    })

    return orders
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to get user orders from Firestore')
    throw error
  }
}

/**
 * Check if an order already exists for a given Stripe session
 * Used for webhook idempotency !!!
 */
export async function getOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  try {
    const db = getDb()
    const ordersSnapshot = await db.collection('orders').where('stripeSessionId', '==', stripeSessionId).limit(1).get()

    if (ordersSnapshot.empty) {
      return null
    }

    return ordersSnapshot.docs[0].data() as Order
  } catch (error) {
    logger.error({ err: error, stripeSessionId }, 'Failed to check existing order')
    throw error
  }
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  try {
    const db = getDb()
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: new Date().toISOString(),
    })

    logger.info({ orderId, status }, 'Order status updated')
  } catch (error) {
    logger.error({ err: error, orderId, status }, 'Failed to update order status')
    throw error
  }
}
