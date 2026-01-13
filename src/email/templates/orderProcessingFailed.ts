import { sendEmail, getEmailFrom } from '../emailService'
import type { EmailResult, OrderProcessingFailedEmailData } from '../../types/emailTypes'

function generateOrderProcessingFailedHTML(data: OrderProcessingFailedEmailData): string {
  const { sessionId } = data

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Processing Issue</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Merriweather', serif; background-color: #fafafa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea;">

          <!-- Logo & Warning Icon & Header -->
          <tr>
            <td style="padding: 48px 32px 32px 32px; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 32px;">
                <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', serif; letter-spacing: 2px;">TEXTILECOM</h1>
              </div>

              <!-- Warning Icon -->
              <div style="margin-bottom: 24px;">
                <table style="margin: 0 auto;">
                  <tr>
                    <td style="width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 64px; font-size: 32px; color: #f59e0b;">
                      ⚠
                    </td>
                  </tr>
                </table>
              </div>

              <h2 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', serif; letter-spacing: -0.3px;">Order Processing Issue</h2>
            </td>
          </tr>

          <!-- Message Content -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #1a1a1a; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 400;">
                  We received your payment successfully, but encountered an issue while processing your order.
                </p>
              </div>

              <!-- Important Notice Box -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">IMPORTANT</h3>
                <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 400;">
                  <strong>Your payment was successful and will not be charged again.</strong><br/>
                  Our team has been automatically notified and is working to complete your order manually.
                </p>
              </div>

              <!-- What Happens Next -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">WHAT HAPPENS NEXT</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="width: 32px; height: 32px; background-color: #dbeafe; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; color: #1e40af; font-weight: 600; display: inline-block; font-family: 'Playfair Display', serif;">1</div>
                    </td>
                    <td style="padding: 12px 0 12px 16px;">
                      <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">Our support team will review your order</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="width: 32px; height: 32px; background-color: #dbeafe; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; color: #1e40af; font-weight: 600; display: inline-block; font-family: 'Playfair Display', serif;">2</div>
                    </td>
                    <td style="padding: 12px 0 12px 16px;">
                      <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">We'll process your order and confirm the details</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="width: 32px; height: 32px; background-color: #dbeafe; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; color: #1e40af; font-weight: 600; display: inline-block; font-family: 'Playfair Display', serif;">3</div>
                    </td>
                    <td style="padding: 12px 0 12px 16px;">
                      <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">You'll receive an order confirmation within 24 hours</p>
                    </td>
                  </tr>
                </table>
              </div>

              ${
                sessionId
                  ? `
              <!-- Reference Information -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">REFERENCE INFORMATION</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300; width: 40%;">Session ID</td>
                    <td style="padding: 4px 0; font-size: 11px; color: #1a1a1a; font-family: monospace; word-break: break-all;">${sessionId}</td>
                  </tr>
                </table>
                <p style="margin: 12px 0 0 0; font-size: 11px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300; font-style: italic;">
                  Please reference this information if you contact support.
                </p>
              </div>
              `
                  : ''
              }

              <!-- Contact Support Box -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e40af; font-weight: 600; font-family: 'Playfair Display', serif;">Need Immediate Assistance?</p>
                <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 400;">
                  If you have any questions or concerns, please contact our support team. We're here to help!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; text-align: center; border-top: 1px solid #eaeaea;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">
                We sincerely apologize for the inconvenience.
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

export async function sendOrderProcessingFailedEmail(data: OrderProcessingFailedEmailData): Promise<EmailResult> {
  const html = generateOrderProcessingFailedHTML(data)

  return sendEmail({
    from: getEmailFrom(),
    to: data.customerEmail,
    subject: 'Order Processing Issue - TextileCom',
    html,
  })
}
