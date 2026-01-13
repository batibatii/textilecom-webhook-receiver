import logger from '../common/logger'
import type { StripeCheckoutSession } from '../types/stripeValidation'
import { sendAbandonedCartEmail } from '../email/templates/abandonedCart'

export async function handleCheckoutSessionExpired(session: StripeCheckoutSession): Promise<void> {
  try {
    const userId = session.metadata?.userId
    const sessionId = session.id

    logger.info(
      {
        sessionId,
        userId,
        hasEmail: !!session.customer_email,
        amountTotal: session.amount_total ? session.amount_total / 100 : null,
        currency: session.currency,
      },
      'Checkout session expired - customer did not complete payment',
    )

    if (session.customer_email) {
      try {
        await sendAbandonedCartEmail({
          sessionId,
          userId,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
          currency: session.currency,
        })
        logger.info({ sessionId, userId }, 'Abandoned cart email sent successfully')
      } catch (emailError) {
        // Log error but don't fail the webhook processing
        logger.error({ err: emailError, sessionId, userId }, 'Failed to send abandoned cart email')
      }
    } else {
      logger.info({ sessionId }, 'No customer email available - skipping abandoned cart email')
    }
  } catch (error) {
    logger.error({ err: error, sessionId: session.id }, 'Error handling expired checkout session')
    // Don't throw - this is not critical enough to fail the webhook
  }
}
