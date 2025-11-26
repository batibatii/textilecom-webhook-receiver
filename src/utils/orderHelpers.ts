// Format: ORD-YYYYMMDD-RRR (RRR = random 3 digits)

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  return `ORD-${year}${month}${day}-${random}`
}

export function calculateOrderItemTotals(item: {
  price: { amount: number }
  quantity: number
  discount: { rate: number } | null
  taxRate: string
}): { subtotal: number; tax: number; total: number } {
  const basePrice = item.price.amount
  const quantity = item.quantity
  const discountRate = item.discount?.rate || 0
  const taxMultiplier = parseFloat(item.taxRate)

  const discountedPrice = basePrice * (1 - discountRate / 100)

  const subtotal = discountedPrice * quantity

  const tax = subtotal * (taxMultiplier - 1)

  const total = subtotal + tax

  return {
    subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

export function calculateOrderTotals(
  items: Array<{ subtotal: number; tax: number; total: number }>,
  currency: string,
): { subtotal: number; tax: number; total: number; currency: string } {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = items.reduce((sum, item) => sum + item.tax, 0)
  const total = items.reduce((sum, item) => sum + item.total, 0)

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency,
  }
}
