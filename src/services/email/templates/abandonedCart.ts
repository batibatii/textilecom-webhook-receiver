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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Merriweather:wght@300;400;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Merriweather', serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', serif;">You Left Items in Your Cart 🛒</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 20px 0; font-size: 18px; color: #333; line-height: 1.6; font-family: 'Merriweather', serif;">
                  Don't miss out! Complete your purchase before your items are gone.
                </p>

                ${
                  totalAmount && data.currency
                    ? `
                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 4px; text-align: left;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Your Cart Total</p>
                  <p style="margin: 0; font-size: 32px; font-weight: 700; color: #667eea; font-family: 'Playfair Display', serif;">${formatCurrency(totalAmount, data.currency)}</p>
                </div>
                `
                    : ''
                }

                <p style="margin: 0 0 30px 0; font-size: 16px; color: #666; line-height: 1.6; font-family: 'Merriweather', serif;">
                  Your selected items are still waiting for you. Complete your checkout now to secure them!
                </p>

                <!-- CTA Button -->
                <table role="presentation" style="margin: 0 auto;">
                  <tr>
                    <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 0;">
                      <a href="${cartUrl}" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: 'Playfair Display', serif;">
                        Complete Your Purchase
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Benefits Section -->
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                <h2 style="font-size: 20px; font-weight: 600; color: #333; margin: 0 0 20px 0; text-align: center; font-family: 'Playfair Display', serif;">Why Shop With Us?</h2>

                <table style="width: 100%; margin-bottom: 10px;">
                  <tr>
                    <td style="padding: 12px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">🚚</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; font-family: 'Playfair Display', serif;">Free Shipping</div>
                        <div style="font-size: 12px; color: #666; font-family: 'Merriweather', serif;">On orders over $50</div>
                      </div>
                    </td>
                    <td style="padding: 12px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; font-family: 'Playfair Display', serif;">Secure Payment</div>
                        <div style="font-size: 12px; color: #666; font-family: 'Merriweather', serif;">100% secure checkout</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">↩️</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; font-family: 'Playfair Display', serif;">Easy Returns</div>
                        <div style="font-size: 12px; color: #666; font-family: 'Merriweather', serif;">30-day return policy</div>
                      </div>
                    </td>
                    <td style="padding: 12px; width: 50%; vertical-align: top;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">💎</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; font-family: 'Playfair Display', serif;">Quality Products</div>
                        <div style="font-size: 12px; color: #666; font-family: 'Merriweather', serif;">Premium materials</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Info Box -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-top: 30px;">
                <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6; font-family: 'Merriweather', serif;">
                  <strong>⏰ Don't Wait!</strong><br/>
                  Items in your cart are popular and may sell out soon. Complete your purchase now to secure them.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">
                Need help? Contact our support team.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999; font-family: 'Merriweather', serif;">
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
