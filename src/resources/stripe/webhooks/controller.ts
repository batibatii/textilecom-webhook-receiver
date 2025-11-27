import { Request, Response, NextFunction } from 'express'
import { stripe, endpointSecret } from '../../../services/stripe'
import logger from '../../../common/logger'
import { StripeCheckoutSessionSchema } from '../../../types/stripeValidation'
import { ZodError } from 'zod'
import { handleCheckoutSessionCompleted } from '../../../services/checkoutHandler'

const receiveUpdates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!endpointSecret) {
      logger.error('STRIPE_WEBHOOK_SIGNING_SECRET is not configured')
      return res.status(500).json({ error: 'Webhook configuration error' })
    }

    const signature = req.headers['stripe-signature']

    if (!signature) {
      logger.warn('Webhook received without stripe-signature header')
      return res.status(400).json({ error: 'Missing signature' })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret)
    } catch (err) {
      const error = err as Error
      logger.warn({ err: error }, 'Webhook signature verification failed')
      return res.status(400).json({ error: 'Invalid signature' })
    }

    logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook event')

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object

          try {
            const validatedSession = StripeCheckoutSessionSchema.parse(checkoutSession)
            logger.info(
              { sessionId: validatedSession.id, userId: validatedSession.metadata?.userId },
              'Checkout session completed successfully',
            )

            if (!validatedSession.metadata?.userId) {
              throw new Error('User ID not found in session metadata')
            }

            await handleCheckoutSessionCompleted(validatedSession)
          } catch (validationError) {
            if (validationError instanceof ZodError) {
              logger.error(
                { errors: validationError.issues, sessionId: checkoutSession.id },
                'Checkout session validation failed',
              )
              throw new Error('Invalid checkout session structure')
            }
            throw validationError
          }
          break
        }
        case 'checkout.session.expired': {
          const checkoutSession = event.data.object
          logger.info({ sessionId: checkoutSession.id }, 'Checkout session expired')
          // TODO: Define and call a method to handle the expired session
          // await handleCheckoutSessionExpired(checkoutSession);
          break
        }
        default: {
          logger.info({ eventType: event.type }, 'Received unhandled event type')
        }
      }
    } catch (err) {
      const error = err as Error
      logger.error({ err: error, eventType: event.type, eventId: event.id }, 'Error processing webhook event')
      // Still return 200 to acknowledge receipt, but log the processing error
      // Stripe will not retry if we return 200
      return res.status(200).json({ received: true, processed: false })
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true })
  } catch (err) {
    next(err)
  }
}

export default {
  receiveUpdates,
}
