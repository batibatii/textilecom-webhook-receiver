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
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <img src="${item.image}" alt="${item.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <div style="font-weight: 600; color: #333; margin-bottom: 4px; font-family: 'Merriweather', serif;">${item.title}</div>
        <div style="font-size: 14px; color: #666; font-family: 'Merriweather', serif;">${item.brand}</div>
        ${item.size ? `<div style="font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Size: ${item.size}</div>` : ''}
        ${item.discount && item.discount.rate > 0 ? `<div style="font-size: 14px; color: #e74c3c; font-family: 'Merriweather', serif;">-${item.discount.rate}% off</div>` : ''}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center; font-family: 'Merriweather', serif;">
        ${item.quantity}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-family: 'Merriweather', serif;">
        ${formatCurrency(item.price.amount, item.price.currency)}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; font-family: 'Merriweather', serif;">
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
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', serif;">Thank You for Your Order! 🎉</h1>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 30px;">
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Order Number</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #333; font-family: 'Playfair Display', serif;">${order.orderNumber}</p>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Order Date: ${orderDate}</p>
              </div>

              <!-- Customer Info -->
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #333; margin: 0 0 15px 0; font-family: 'Playfair Display', serif;">Customer Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px; width: 30%; font-family: 'Merriweather', serif;">Name:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; font-family: 'Merriweather', serif;">${order.customerInfo.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px; font-family: 'Merriweather', serif;">Email:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; font-family: 'Merriweather', serif;">${order.customerInfo.email}</td>
                  </tr>
                  ${
                    order.customerInfo.phone
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px; font-family: 'Merriweather', serif;">Phone:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; font-family: 'Merriweather', serif;">${order.customerInfo.phone}</td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              ${
                hasShippingAddress
                  ? `
              <!-- Shipping Address -->
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #333; margin: 0 0 15px 0; font-family: 'Playfair Display', serif;">Shipping Address</h2>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px; color: #333; line-height: 1.6; font-family: 'Merriweather', serif;">
                  ${formatAddress(order.customerInfo.address!)}
                </div>
              </div>
              `
                  : ''
              }

              <!-- Order Items -->
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #333; margin: 0 0 15px 0; font-family: 'Playfair Display', serif;">Order Details</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f8f9fa;">
                      <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; font-family: 'Merriweather', serif;">Product</th>
                      <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; font-family: 'Merriweather', serif;">Details</th>
                      <th style="padding: 12px 15px; text-align: center; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; font-family: 'Merriweather', serif;">Qty</th>
                      <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; font-family: 'Merriweather', serif;">Price</th>
                      <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; font-family: 'Merriweather', serif;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productRows}
                  </tbody>
                </table>
              </div>

              <!-- Order Summary -->
              <div style="margin-bottom: 30px;">
                <table style="width: 100%; max-width: 300px; margin-left: auto;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Subtotal:</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right; font-weight: 500; font-family: 'Merriweather', serif;">${formatCurrency(order.totals.subtotal, order.totals.currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">Tax:</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right; font-weight: 500; font-family: 'Merriweather', serif;">${formatCurrency(order.totals.tax, order.totals.currency)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #eee;">
                    <td style="padding: 12px 0 0 0; font-size: 18px; color: #333; font-weight: 700; font-family: 'Playfair Display', serif;">Total:</td>
                    <td style="padding: 12px 0 0 0; font-size: 18px; color: #667eea; text-align: right; font-weight: 700; font-family: 'Playfair Display', serif;">${formatCurrency(order.totals.total, order.totals.currency)}</td>
                  </tr>
                </table>
              </div>

              <!-- Info Box -->
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #1976d2; line-height: 1.6; font-family: 'Merriweather', serif;">
                  <strong>📦 What's Next?</strong><br/>
                  We'll send you a shipping confirmation email with tracking information once your order ships.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-family: 'Merriweather', serif;">
                Questions about your order? Contact our support team.
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
