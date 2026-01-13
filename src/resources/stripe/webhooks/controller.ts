import { Request, Response, NextFunction } from 'express'
import { stripe, endpointSecret } from '../../../config/stripe'
import logger from '../../../common/logger'
import { StripeCheckoutSessionSchema } from '../../../types/stripeValidation'
import { ZodError } from 'zod'
import { handleCheckoutSessionCompleted } from '../../../services/checkoutHandler'
import { handleCheckoutSessionExpired } from '../../../services/expiredSessionHandler'
import { sendOrderProcessingFailedEmail } from '../../../email/templates/orderProcessingFailed'

const receiveUpdates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!endpointSecret) {
      logger.error('STRIPE_WEBHOOK_SIGNING_SECRET is not configured')
      return res.status(500).json({ error: 'Internal Server Error' })
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

          try {
            const validatedSession = StripeCheckoutSessionSchema.parse(checkoutSession)
            logger.info(
              { sessionId: validatedSession.id, userId: validatedSession.metadata?.userId },
              'Processing expired checkout session',
            )

            await handleCheckoutSessionExpired(validatedSession)
          } catch (validationError) {
            if (validationError instanceof ZodError) {
              logger.error(
                { errors: validationError.issues, sessionId: checkoutSession.id },
                'Expired session validation failed',
              )
              throw new Error('Invalid expired session structure')
            }
            throw validationError
          }
          break
        }
        default: {
          logger.info({ eventType: event.type }, 'Received unhandled event type')
        }
      }
    } catch (err) {
      const error = err as Error
      logger.error({ err: error, eventType: event.type, eventId: event.id }, 'Error processing webhook event')

      // Notify customer if checkout.session.completed failed (payment received but order processing failed)
      if (event.type === 'checkout.session.completed') {
        try {
          const checkoutSession = event.data.object
          const customerEmail =
            ('customer_email' in checkoutSession && checkoutSession.customer_email) ||
            ('customer_details' in checkoutSession &&
              checkoutSession.customer_details &&
              typeof checkoutSession.customer_details === 'object' &&
              'email' in checkoutSession.customer_details &&
              checkoutSession.customer_details.email) ||
            undefined

          if (customerEmail && typeof customerEmail === 'string') {
            await sendOrderProcessingFailedEmail({
              customerEmail,
              sessionId: checkoutSession.id,
              errorDetails: error.message,
            })
            logger.info({ customerEmail, sessionId: checkoutSession.id }, 'Sent order processing failure notification')
          } else {
            logger.warn({ sessionId: checkoutSession.id }, 'Cannot send failure notification - no customer email found')
          }
        } catch (emailError) {
          // Don't fail the webhook response if email notification fails
          logger.error({ err: emailError }, 'Failed to send order processing failure notification')
        }
      }

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
