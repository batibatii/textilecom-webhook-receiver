import { sendEmail, getEmailFrom } from '../emailService'
import { formatCurrency } from '../../../utils/formatHelpers'
import type { EmailResult, AbandonedCartEmailData } from '../../../types/emailTypes'

function generateAbandonedCartHTML(data: AbandonedCartEmailData): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const cartUrl = `${frontendUrl}/cart`

  const hasAmount = data.amountTotal !== null && data.amountTotal !== undefined
  const totalAmount = hasAmount ? data.amountTotal! / 100 : null // Convert from cents

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Purchase</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Merriweather', serif; background-color: #fafafa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea;">

          <!-- Logo & Header -->
          <tr>
            <td style="padding: 48px 32px 32px 32px; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 32px;">
                <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', serif; letter-spacing: 2px;">TEXTILECOM</h1>
              </div>

              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', serif; letter-spacing: -0.3px;">You Left Items in Your Cart</h2>
              <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 300;">
                Complete your purchase before your items are gone.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              ${
                totalAmount && data.currency
                  ? `
              <!-- Cart Total -->
              <div style="text-align: center; margin-bottom: 32px; padding: 24px; border: 1px solid #eaeaea;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300; text-transform: uppercase; letter-spacing: 0.5px;">Your Cart Total</p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #1a1a1a; font-family: 'Playfair Display', serif;">${formatCurrency(totalAmount, data.currency)}</p>
              </div>
              `
                  : ''
              }

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <table role="presentation" style="margin: 0 auto;">
                  <tr>
                    <td style="background-color: #1a1a1a; padding: 0;">
                      <a href="${cartUrl}" style="display: inline-block; padding: 14px 40px; font-size: 11px; font-weight: 400; color: #ffffff; text-decoration: none; font-family: 'Merriweather', serif; letter-spacing: 1px; text-transform: uppercase;">
                        COMPLETE YOUR PURCHASE
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Info Box -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 16px; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 400;">
                  Don't wait – items in your cart are popular and may sell out soon.
                </p>
              </div>

              <!-- Benefits Section -->
              <div style="border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h2 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 24px 0; text-align: center; font-family: 'Playfair Display', serif; letter-spacing: 0.5px; text-transform: uppercase;">Why Shop With Us</h2>

                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 16px 8px; width: 50%; vertical-align: top; border-right: 1px solid #eaeaea;">
                      <div style="text-align: center;">
                        <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">FREE SHIPPING</div>
                        <div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">On orders over $50</div>
                      </div>
                    </td>
                    <td style="padding: 16px 8px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">SECURE PAYMENT</div>
                        <div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">100% secure checkout</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 0;"><div style="height: 1px; background-color: #eaeaea;"></div></td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 8px; width: 50%; vertical-align: top; border-right: 1px solid #eaeaea;">
                      <div style="text-align: center;">
                        <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">EASY RETURNS</div>
                        <div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">30-day return policy</div>
                      </div>
                    </td>
                    <td style="padding: 16px 8px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">QUALITY PRODUCTS</div>
                        <div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Premium materials</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; text-align: center; border-top: 1px solid #eaeaea;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">
                Need help? Contact our support team.
              </p>
              <p style="margin: 0; font-size: 11px; color: #a3a3a3; font-family: 'Merriweather', serif; font-weight: 300;">
                © ${new Date().getFullYear()} TextileCom. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function sendAbandonedCartEmail(data: AbandonedCartEmailData): Promise<EmailResult> {
  const html = generateAbandonedCartHTML(data)

  return sendEmail({
    from: getEmailFrom(),
    to: data.customerEmail,
    subject: 'Complete Your Purchase - Your Cart is Waiting',
    html,
  })
}
