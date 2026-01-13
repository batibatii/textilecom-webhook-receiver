import { Resend } from 'resend'
import logger from '../common/logger'
import type { EmailConfig, EmailResult } from '../types/emailTypes'

const resendApiKey = process.env.RESEND_API_KEY
const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev'

let resend: Resend | null = null

if (resendApiKey) {
  resend = new Resend(resendApiKey)
  logger.info('Resend email service initialized')
} else {
  logger.warn('RESEND_API_KEY not configured - email notifications will be disabled')
}

export async function sendEmail(config: EmailConfig): Promise<EmailResult> {
  try {
    if (!resend) {
      logger.warn('Email service not initialized - skipping email send')
      return {
        success: false,
        error: 'Email service not configured',
      }
    }

    const result = await resend.emails.send({
      from: config.from,
      to: config.to,
      subject: config.subject,
      html: config.html,
    })

    logger.info(
      {
        to: config.to,
        subject: config.subject,
        messageId: result.data?.id,
      },
      'Email sent successfully',
    )

    return {
      success: true,
      messageId: result.data?.id,
    }
  } catch (error) {
    const err = error as Error
    logger.error(
      {
        err,
        to: config.to,
        subject: config.subject,
      },
      'Failed to send email',
    )

    return {
      success: false,
      error: err.message,
    }
  }
}

export function getEmailFrom(): string {
  return emailFrom
}
