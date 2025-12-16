import { v4 as uuidv4 } from 'uuid'

// Generate unique order ID using UUID v4 (completely random)
export function generateOrderId(): string {
  return uuidv4()
}

// Format: ORD-{counter}-{short UUID}
// Example: ORD-000001-A1B2C3D4
export function generateOrderNumber(counter: number): string {
  if (!Number.isInteger(counter)) {
    throw new Error(`Invalid counter: ${counter}. Must be an integer.`)
  }
  if (counter < 1) {
    throw new Error(`Invalid counter: ${counter}. Must be a positive integer (>= 1).`)
  }
  if (counter > 999999) {
    throw new Error(`Counter ${counter} exceeds maximum value of 999,999.`)
  }

  const uuid = uuidv4()
  const shortUuid = uuid.substring(0, 8).toUpperCase() // First 8 chars for brevity
  const paddedCounter = counter.toString().padStart(6, '0') // 6-digit counter

  // Counter first for sortability
  return `ORD-${paddedCounter}-${shortUuid}`
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

  // Parse and validate taxRate - default to 1.0 (0% tax) if invalid
  let taxMultiplier = parseFloat(item.taxRate)
  if (isNaN(taxMultiplier) || taxMultiplier < 0) {
    taxMultiplier = 1.0
  }

  const discountedPrice = basePrice * (1 - discountRate / 100)
  const subtotal = discountedPrice * quantity
  const tax = subtotal * (taxMultiplier - 1)
  const total = subtotal + tax

  return {
    subtotal: isNaN(subtotal) ? 0 : Math.round(subtotal * 100) / 100,
    tax: isNaN(tax) ? 0 : Math.round(tax * 100) / 100,
    total: isNaN(total) ? 0 : Math.round(total * 100) / 100,
  }
}

export function calculateOrderTotals(
  items: Array<{ subtotal: number; tax: number; total: number }>,
  currency: string,
): { subtotal: number; tax: number; total: number; currency: string } {
  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0)
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0)

  return {
    subtotal: isNaN(subtotal) ? 0 : Math.round(subtotal * 100) / 100,
    tax: isNaN(tax) ? 0 : Math.round(tax * 100) / 100,
    total: isNaN(total) ? 0 : Math.round(total * 100) / 100,
    currency,
  }
}
