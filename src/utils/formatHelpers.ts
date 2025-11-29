export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    TRY: '₺',
  }

  const symbol = currencySymbols[currency.toUpperCase()] || currency

  return `${symbol}${amount.toFixed(2)}`
}

// Format ISO date string for display
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format address object as HTML string
export function formatAddress(address: {
  line1: string
  line2?: string
  city: string
  postalCode: string
  country: string
}): string {
  const parts = [address.line1, address.line2, `${address.city}, ${address.postalCode}`, address.country].filter(
    Boolean,
  )

  return parts.join('<br/>')
}
