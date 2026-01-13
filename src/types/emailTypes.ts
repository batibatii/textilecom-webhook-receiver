import type { Order } from './orderValidation'

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface OrderConfirmationEmailData {
  order: Order
}

export interface AbandonedCartEmailData {
  sessionId: string
  userId?: string
  customerEmail: string
  amountTotal?: number | null
  currency?: string
}

export interface OrderProcessingFailedEmailData {
  customerEmail: string
  sessionId?: string
  errorDetails?: string
}

export interface EmailConfig {
  from: string
  to: string
  subject: string
  html: string
}
