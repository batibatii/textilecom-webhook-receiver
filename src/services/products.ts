import { getDb } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import logger from '../common/logger'

/**
 * Decrement stock for products in a single transaction
 * Prevents race conditions when multiple orders happen simultaneously
 */
export async function decrementMultipleProductsStock(
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  const db = getDb()
  const transactionStartTime = Date.now()

  try {
    await db.runTransaction(async (transaction) => {
      const productRefs = items.map((item) => db.collection('products').doc(item.productId))
      const productDocs = await Promise.all(productRefs.map((ref) => transaction.get(ref)))

      // Validate all products exist and have sufficient stock
      const updates: Array<{ ref: any; productId: string; quantity: number; currentStock: number }> = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const doc = productDocs[i]

        if (!doc.exists) {
          throw new Error(`Product ${item.productId} not found`)
        }

        const productData = doc.data()
        const currentStock = productData?.stock || 0

        if (currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.productId}. Available: ${currentStock}, Requested: ${item.quantity}`,
          )
        }

        updates.push({
          ref: productRefs[i],
          productId: item.productId,
          quantity: item.quantity,
          currentStock,
        })
      }

      for (const update of updates) {
        transaction.update(update.ref, {
          stock: FieldValue.increment(-update.quantity),
          updatedAt: new Date().toISOString(),
        })

        logger.info(
          {
            productId: update.productId,
            quantityDecremented: update.quantity,
            previousStock: update.currentStock,
            newStock: update.currentStock - update.quantity,
          },
          'Product stock decremented in batch',
        )
      }
    })

    const transactionDuration = Date.now() - transactionStartTime

    logger.info(
      {
        itemCount: items.length,
        transactionDuration,
        productIds: items.map((i) => i.productId),
      },
      `Successfully decremented stock for all products in ${transactionDuration}ms`,
    )
  } catch (error) {
    logger.error({ err: error, itemCount: items.length }, 'Failed to decrement multiple products stock')
    throw error
  }
}

export async function getProductById(productId: string): Promise<any | null> {
  try {
    const db = getDb()
    const productDoc = await db.collection('products').doc(productId).get()

    if (!productDoc.exists) {
      return null
    }

    return productDoc.data()
  } catch (error) {
    logger.error({ err: error, productId }, 'Failed to get product')
    throw error
  }
}
