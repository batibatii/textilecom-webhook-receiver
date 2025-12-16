import { getDb } from '../config/firebase'
import { FieldValue, Transaction } from 'firebase-admin/firestore'
import logger from '../common/logger'

const COUNTER_COLLECTION = 'counters'
const ORDER_COUNTER_DOC = 'orderCounter'
interface CounterDocument {
  value: number
  updatedAt: FirebaseFirestore.Timestamp
}
export async function getNextOrderCounter(): Promise<number> {
  const db = getDb()
  const counterRef = db.collection(COUNTER_COLLECTION).doc(ORDER_COUNTER_DOC)

  try {
    // Use Firestore transaction to atomically increment and get the counter
    const newCounter = await db.runTransaction(async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef)

      let currentValue: number

      if (counterDoc.exists) {
        // Document exists, increment the value
        const data = counterDoc.data() as CounterDocument | undefined
        currentValue = (data?.value ?? 0) + 1
      } else {
        // First time - initialize counter at 1
        currentValue = 1
      }

      transaction.set(
        counterRef,
        {
          value: currentValue,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      return currentValue
    })

    logger.info({ counter: newCounter }, 'Order counter incremented')
    return newCounter
  } catch (error) {
    // Preserve original error with full stack trace and context
    logger.error({ err: error }, 'Failed to get next order counter')
    throw error
  }
}
