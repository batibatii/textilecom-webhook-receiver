export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
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
