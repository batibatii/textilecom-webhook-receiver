import { getDb } from '../config/firebase'
import { FieldValue, Transaction } from 'firebase-admin/firestore'

const COUNTER_COLLECTION = 'counters'
const ORDER_COUNTER_DOC = 'orderCounter'

// Get next order counter value atomically
export async function getNextOrderCounter(): Promise<number> {
  const db = getDb()
  const counterRef = db.collection(COUNTER_COLLECTION).doc(ORDER_COUNTER_DOC)

  try {
    // Use Firestore transaction to atomically increment and get the counter
    const newCounter = await db.runTransaction(async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef)

      let currentValue = 1

      if (counterDoc.exists) {
        currentValue = (counterDoc.data()?.value || 0) + 1
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

    return newCounter
  } catch (error) {
    throw new Error(`Failed to get next order counter: ${error}`)
  }
}
