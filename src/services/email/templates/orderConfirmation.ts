import { sendEmail, getEmailFrom } from '../emailService'
import { formatCurrency, formatDate, formatAddress } from '../../../utils/formatHelpers'
import type { Order } from '../../../types/orderValidation'
import type { EmailResult, OrderConfirmationEmailData } from '../../../types/emailTypes'

function generateOrderConfirmationHTML(order: Order): string {
  const orderDate = formatDate(order.createdAt)
  const hasShippingAddress = !!order.customerInfo.address

  const productRows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #eaeaea;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 12px;">
              <img src="${item.image}" alt="${item.title}" style="width: 64px; height: 64px; object-fit: cover; display: block;" />
            </td>
            <td style="vertical-align: top;">
              <div style="font-weight: 400; font-size: 13px; color: #1a1a1a; margin-bottom: 4px; font-family: 'Merriweather', serif; letter-spacing: 0.3px;">${item.title.toUpperCase()}</div>
              <div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">${item.brand}</div>
              ${item.size ? `<div style="font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Size: ${item.size}</div>` : ''}
              ${item.discount && item.discount.rate > 0 ? `<div style="font-size: 12px; color: #166534; background-color: #dcfce7; display: inline-block; padding: 2px 6px; margin-top: 4px; font-family: 'Merriweather', serif; font-weight: 400;">-${item.discount.rate}% OFF</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #eaeaea; text-align: center; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 300;">
        ${item.quantity}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">
        ${formatCurrency(item.total, order.totals.currency)}
      </td>
    </tr>
  `,
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Merriweather', serif; background-color: #fafafa; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea;">

          <!-- Logo & Success Icon & Header -->
          <tr>
            <td style="padding: 48px 32px 32px 32px; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 32px;">
                <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', serif; letter-spacing: 2px;">TEXTILECOM</h1>
              </div>

              <!-- Success Checkmark -->
              <table style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600; font-family: 'Playfair Display', serif; letter-spacing: -0.3px;">Thank You for Your Purchase</h2>
            </td>
          </tr>

          <!-- Order Info Card -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 400; color: #1a1a1a; font-family: 'Merriweather', serif;">Order ${order.orderNumber}</p>
                <p style="margin: 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Placed on ${orderDate}</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">A confirmation email has been sent to ${order.customerInfo.email}</p>
              </div>

              <!-- Order Items -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">ORDER ITEMS</h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tbody>
                    ${productRows}
                  </tbody>
                </table>
              </div>

              <!-- Order Summary -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Subtotal</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; text-align: right; font-weight: 400; font-family: 'Merriweather', serif;">${formatCurrency(order.totals.subtotal, order.totals.currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Tax</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; text-align: right; font-weight: 400; font-family: 'Merriweather', serif;">${formatCurrency(order.totals.tax, order.totals.currency)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #eaeaea;">
                    <td style="padding: 12px 0 0 0; font-size: 18px; color: #1a1a1a; font-weight: 700; font-family: 'Playfair Display', serif;">Total</td>
                    <td style="padding: 12px 0 0 0; font-size: 18px; color: #1a1a1a; text-align: right; font-weight: 700; font-family: 'Playfair Display', serif;">${formatCurrency(order.totals.total, order.totals.currency)}</td>
                  </tr>
                </table>
              </div>

              ${
                hasShippingAddress
                  ? `
              <!-- Shipping Address -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">SHIPPING ADDRESS</h3>
                <div style="font-size: 13px; color: #1a1a1a; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 300;">
                  ${formatAddress(order.customerInfo.address!)}
                </div>
              </div>
              `
                  : ''
              }

              <!-- Customer Info -->
              <div style="margin-bottom: 24px; border-top: 1px solid #eaeaea; padding-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">CUSTOMER INFORMATION</h3>
                <table style="width: 100%;">
                  ${
                    order.customerInfo.name
                      ? `
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300; width: 30%;">Name</td>
                    <td style="padding: 4px 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">${order.customerInfo.name}</td>
                  </tr>
                  `
                      : ''
                  }
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Email</td>
                    <td style="padding: 4px 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">${order.customerInfo.email}</td>
                  </tr>
                  ${
                    order.customerInfo.phone
                      ? `
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">Phone</td>
                    <td style="padding: 4px 0; font-size: 13px; color: #1a1a1a; font-family: 'Merriweather', serif; font-weight: 400;">${order.customerInfo.phone}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              <!-- Info Box -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.6; font-family: 'Merriweather', serif; font-weight: 400;">
                  Your order is being prepared<br/>
                  We'll send you a shipping confirmation email with tracking information once your order ships.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; text-align: center; border-top: 1px solid #eaeaea;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; font-family: 'Merriweather', serif; font-weight: 300;">
                Questions about your order? Contact our support team.
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

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData): Promise<EmailResult> {
  const { order } = data

  const html = generateOrderConfirmationHTML(order)

  return sendEmail({
    from: getEmailFrom(),
    to: order.customerInfo.email,
    subject: `Order Confirmation - Order #${order.orderNumber}`,
    html,
  })
}
