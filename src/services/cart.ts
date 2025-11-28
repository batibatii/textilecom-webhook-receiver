import { getDb } from '../config/firebase'
import logger from '../common/logger'

export async function deleteCart(userId: string): Promise<void> {
  try {
    const db = getDb()
    const cartRef = db.collection('carts').doc(userId)

    await cartRef.delete()

    logger.info({ userId }, 'Cart cleared successfully after order completion')
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to delete cart')
    throw error
  }
}

export async function cartExists(userId: string): Promise<boolean> {
  try {
    const db = getDb()
    const cartDoc = await db.collection('carts').doc(userId).get()

    return cartDoc.exists
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to check cart existence')
    throw error
  }
}
