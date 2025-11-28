import logger from '../common/logger'
import type { StripeCheckoutSession } from '../types/stripeValidation'

export async function handleCheckoutSessionExpired(session: StripeCheckoutSession): Promise<void> {
  try {
    const userId = session.metadata?.userId
    const sessionId = session.id

    logger.info(
      {
        sessionId,
        userId,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total ? session.amount_total / 100 : null,
        currency: session.currency,
      },
      'Checkout session expired - customer did not complete payment',
    )
  } catch (error) {
    logger.error({ err: error, sessionId: session.id }, 'Error handling expired checkout session')
    // Don't throw - this is not critical enough to fail the webhook
  }
}
