import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import logger from '../common/logger'

let app: App | undefined
let db: Firestore | undefined

export function initializeFirebase(): Firestore {
  if (db) {
    return db
  }

  try {
    const existingApps = getApps()

    if (existingApps.length === 0) {
      if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
        throw new Error('FIREBASE_ADMIN_PROJECT_ID is required but not defined')
      }
      if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
        throw new Error('FIREBASE_ADMIN_CLIENT_EMAIL is required but not defined')
      }
      if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
        throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is required but not defined')
      }

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      })

      logger.info('Firebase Admin SDK initialized successfully')
    } else {
      app = existingApps[0]
      logger.info('Using existing Firebase Admin SDK instance')
    }

    db = getFirestore(app)

    return db
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK')
    throw error
  }
}

export function getDb(): Firestore {
  if (!db) {
    return initializeFirebase()
  }
  return db
}
