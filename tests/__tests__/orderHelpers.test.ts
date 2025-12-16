// Mock uuid before importing orderHelpers
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7'),
}))

import {
  calculateOrderItemTotals,
  calculateOrderTotals,
  generateOrderNumber,
  generateOrderId,
} from '../../src/utils/orderHelpers'

describe('calculateOrderItemTotals', () => {
  describe('basic calculations without discount or tax', () => {
    it('should calculate totals for a simple item with no discount and no tax', () => {
      const item = {
        price: { amount: 10.0 },
        quantity: 2,
        discount: null,
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 20.0,
        tax: 0.0,
        total: 20.0,
      })
    })

    it('should handle single quantity items', () => {
      const item = {
        price: { amount: 99.99 },
        quantity: 1,
        discount: null,
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 99.99,
        tax: 0.0,
        total: 99.99,
      })
    })
  })

  describe('calculations with tax', () => {
    it('should calculate totals with 20% tax (taxRate 1.2)', () => {
      const item = {
        price: { amount: 100.0 },
        quantity: 1,
        discount: null,
        taxRate: '1.2',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
      })
    })

    it('should calculate totals with 8% tax (taxRate 1.08)', () => {
      const item = {
        price: { amount: 50.0 },
        quantity: 2,
        discount: null,
        taxRate: '1.08',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 8.0,
        total: 108.0,
      })
    })

    it('should calculate totals with 18% tax (taxRate 1.18)', () => {
      const item = {
        price: { amount: 25.0 },
        quantity: 4,
        discount: null,
        taxRate: '1.18',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 18.0,
        total: 118.0,
      })
    })
  })

  describe('calculations with discount', () => {
    it('should apply 10% discount correctly', () => {
      const item = {
        price: { amount: 100.0 },
        quantity: 1,
        discount: { rate: 10 },
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 90.0,
        tax: 0.0,
        total: 90.0,
      })
    })

    it('should apply 50% discount correctly', () => {
      const item = {
        price: { amount: 200.0 },
        quantity: 2,
        discount: { rate: 50 },
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 200.0,
        tax: 0.0,
        total: 200.0,
      })
    })

    it('should apply 25% discount correctly', () => {
      const item = {
        price: { amount: 80.0 },
        quantity: 1,
        discount: { rate: 25 },
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 60.0,
        tax: 0.0,
        total: 60.0,
      })
    })
  })

  describe('calculations with both discount and tax', () => {
    it('should apply discount before tax with quantity (10% discount, 8% tax, qty 3)', () => {
      const item = {
        price: { amount: 50.0 },
        quantity: 3,
        discount: { rate: 10 },
        taxRate: '1.08',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 135.0,
        tax: 10.8,
        total: 145.8,
      })
    })
  })

  describe('rounding behavior', () => {
    it('should round to 2 decimal places', () => {
      const item = {
        price: { amount: 10.99 },
        quantity: 3,
        discount: null,
        taxRate: '1.2',
      }

      const result = calculateOrderItemTotals(item)

      // Subtotal: 10.99 * 3 = 32.97
      // Tax: 32.97 * 0.2 = 6.594, rounded to 6.59
      // Total: 32.97 + 6.59 = 39.56
      expect(result).toEqual({
        subtotal: 32.97,
        tax: 6.59,
        total: 39.56,
      })
    })

    it('should handle prices that result in repeating decimals', () => {
      const item = {
        price: { amount: 9.99 },
        quantity: 1,
        discount: { rate: 33.33 },
        taxRate: '1.0',
      }

      const result = calculateOrderItemTotals(item)

      // Price: 9.99, after 33.33% discount: 6.662667
      // Rounded to: 6.66
      expect(result.subtotal).toBe(6.66)
      expect(result.tax).toBe(0.0)
      expect(result.total).toBe(6.66)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle zero price', () => {
      const item = {
        price: { amount: 0 },
        quantity: 5,
        discount: null,
        taxRate: '1.2',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 0.0,
        tax: 0.0,
        total: 0.0,
      })
    })

    it('should default to 1.0 (0% tax) for invalid taxRate (NaN)', () => {
      const item = {
        price: { amount: 100.0 },
        quantity: 1,
        discount: null,
        taxRate: 'invalid',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 0.0,
        total: 100.0,
      })
    })

    it('should default to 1.0 (0% tax) for negative taxRate', () => {
      const item = {
        price: { amount: 100.0 },
        quantity: 1,
        discount: null,
        taxRate: '-0.5',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 0.0,
        total: 100.0,
      })
    })

    it('should handle null discount as 0% discount', () => {
      const item = {
        price: { amount: 50.0 },
        quantity: 2,
        discount: null,
        taxRate: '1.2',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
      })
    })

    it('should handle 0% discount', () => {
      const item = {
        price: { amount: 50.0 },
        quantity: 2,
        discount: { rate: 0 },
        taxRate: '1.2',
      }

      const result = calculateOrderItemTotals(item)

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
      })
    })
  })
})

describe('calculateOrderTotals', () => {
  describe('basic order calculations', () => {
    it('should calculate totals for a single item order', () => {
      const items = [
        {
          subtotal: 100.0,
          tax: 20.0,
          total: 120.0,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
        currency: 'USD',
      })
    })

    it('should calculate totals for multiple items', () => {
      const items = [
        {
          subtotal: 50.0,
          tax: 10.0,
          total: 60.0,
        },
        {
          subtotal: 30.0,
          tax: 6.0,
          total: 36.0,
        },
        {
          subtotal: 20.0,
          tax: 4.0,
          total: 24.0,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
        currency: 'USD',
      })
    })

    it('should handle orders with no tax', () => {
      const items = [
        {
          subtotal: 25.0,
          tax: 0.0,
          total: 25.0,
        },
        {
          subtotal: 75.0,
          tax: 0.0,
          total: 75.0,
        },
      ]

      const result = calculateOrderTotals(items, 'EUR')

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 0.0,
        total: 100.0,
        currency: 'EUR',
      })
    })
  })

  describe('currency handling', () => {
    it('should preserve USD currency', () => {
      const items = [{ subtotal: 100.0, tax: 8.0, total: 108.0 }]

      const result = calculateOrderTotals(items, 'USD')

      expect(result.currency).toBe('USD')
    })

    it('should handle any currency code', () => {
      const items = [{ subtotal: 50.0, tax: 5.0, total: 55.0 }]

      const result = calculateOrderTotals(items, 'GBP')

      expect(result.currency).toBe('GBP')
    })
  })

  describe('rounding behavior', () => {
    it('should round aggregated subtotals to 2 decimal places', () => {
      const items = [
        {
          subtotal: 10.99,
          tax: 2.2,
          total: 13.19,
        },
        {
          subtotal: 20.99,
          tax: 4.2,
          total: 25.19,
        },
        {
          subtotal: 30.99,
          tax: 6.2,
          total: 37.19,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      // 10.99 + 20.99 + 30.99 = 62.97
      // 2.2 + 4.2 + 6.2 = 12.6
      // 13.19 + 25.19 + 37.19 = 75.57
      expect(result).toEqual({
        subtotal: 62.97,
        tax: 12.6,
        total: 75.57,
        currency: 'USD',
      })
    })

    it('should handle rounding for values with many decimal places', () => {
      const items = [
        {
          subtotal: 33.333,
          tax: 6.667,
          total: 40.0,
        },
        {
          subtotal: 66.667,
          tax: 13.333,
          total: 80.0,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      // 33.333 + 66.667 = 100.0
      // 6.667 + 13.333 = 20.0
      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 120.0,
        currency: 'USD',
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty order (no items)', () => {
      const items: Array<{ subtotal: number; tax: number; total: number }> = []

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 0.0,
        tax: 0.0,
        total: 0.0,
        currency: 'USD',
      })
    })

    it('should handle items with zero values', () => {
      const items = [
        {
          subtotal: 0.0,
          tax: 0.0,
          total: 0.0,
        },
        {
          subtotal: 0.0,
          tax: 0.0,
          total: 0.0,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 0.0,
        tax: 0.0,
        total: 0.0,
        currency: 'USD',
      })
    })

    it('should handle items with undefined values (using || 0)', () => {
      const items = [
        {
          subtotal: 100.0,
          tax: undefined,
          total: 100.0,
        },
        {
          subtotal: undefined,
          tax: 20.0,
          total: 120.0,
        },
      ] as unknown as Array<{ subtotal: number; tax: number; total: number }>

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 100.0,
        tax: 20.0,
        total: 220.0,
        currency: 'USD',
      })
    })

    it('should handle very large monetary values', () => {
      const items = [
        {
          subtotal: 99999.99,
          tax: 19999.99,
          total: 119999.98,
        },
        {
          subtotal: 50000.01,
          tax: 10000.01,
          total: 60000.02,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 150000.0,
        tax: 30000.0,
        total: 180000.0,
        currency: 'USD',
      })
    })

    it('should handle items with very small values (cents)', () => {
      const items = [
        {
          subtotal: 0.01,
          tax: 0.01,
          total: 0.02,
        },
        {
          subtotal: 0.02,
          tax: 0.01,
          total: 0.03,
        },
        {
          subtotal: 0.03,
          tax: 0.01,
          total: 0.04,
        },
      ]

      const result = calculateOrderTotals(items, 'USD')

      expect(result).toEqual({
        subtotal: 0.06,
        tax: 0.03,
        total: 0.09,
        currency: 'USD',
      })
    })
  })

  describe('integration with calculateOrderItemTotals', () => {
    it('should correctly aggregate results from calculateOrderItemTotals', () => {
      const item1 = calculateOrderItemTotals({
        price: { amount: 50.0 },
        quantity: 2,
        discount: { rate: 10 },
        taxRate: '1.2',
      })

      const item2 = calculateOrderItemTotals({
        price: { amount: 30.0 },
        quantity: 1,
        discount: null,
        taxRate: '1.2',
      })

      const result = calculateOrderTotals([item1, item2], 'USD')

      expect(result).toEqual({
        subtotal: 120.0,
        tax: 24.0,
        total: 144.0,
        currency: 'USD',
      })
    })
  })
})

describe('generateOrderId', () => {
  it('should generate a UUID v4', () => {
    const orderId = generateOrderId()
    expect(orderId).toBe('a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7')
  })
})

describe('generateOrderNumber', () => {
  describe('valid counter values', () => {
    it('should generate order number with counter 1', () => {
      const orderNumber = generateOrderNumber(1)
      expect(orderNumber).toBe('ORD-000001-A1B2C3D4')
    })

    it('should generate order number with counter 100', () => {
      const orderNumber = generateOrderNumber(100)
      expect(orderNumber).toBe('ORD-000100-A1B2C3D4')
    })

    it('should generate order number with counter 999999 (max value)', () => {
      const orderNumber = generateOrderNumber(999999)
      expect(orderNumber).toBe('ORD-999999-A1B2C3D4')
    })

    it('should pad counter with leading zeros', () => {
      expect(generateOrderNumber(1)).toBe('ORD-000001-A1B2C3D4')
      expect(generateOrderNumber(42)).toBe('ORD-000042-A1B2C3D4')
      expect(generateOrderNumber(1234)).toBe('ORD-001234-A1B2C3D4')
    })

    it('should use first 8 characters of UUID in uppercase', () => {
      const orderNumber = generateOrderNumber(1)
      // UUID is 'a1b2c3d4-e5f6-4789-g0h1-i2j3k4l5m6n7'
      // First 8 chars: 'a1b2c3d4'
      // Uppercase: 'A1B2C3D4'
      expect(orderNumber).toContain('A1B2C3D4')
    })

    it('should have format ORD-NNNNNN-XXXXXXXX (19 characters total)', () => {
      const orderNumber = generateOrderNumber(123)
      expect(orderNumber).toHaveLength(19)
      expect(orderNumber).toMatch(/^ORD-\d{6}-[A-Z0-9]{8}$/)
    })
  })

  describe('sortability', () => {
    it('should sort order numbers chronologically by counter', () => {
      const order1 = generateOrderNumber(1)
      const order2 = generateOrderNumber(2)
      const order3 = generateOrderNumber(100)
      const order4 = generateOrderNumber(999)

      const orderNumbers = [order4, order2, order1, order3]
      const sorted = orderNumbers.sort()

      expect(sorted).toEqual([order1, order2, order3, order4])
    })

    it('should sort correctly with different counters', () => {
      const orders = [
        generateOrderNumber(500),
        generateOrderNumber(1),
        generateOrderNumber(999999),
        generateOrderNumber(50),
        generateOrderNumber(5000),
      ]

      const sorted = [...orders].sort()

      expect(sorted[0]).toContain('000001')
      expect(sorted[1]).toContain('000050')
      expect(sorted[2]).toContain('000500')
      expect(sorted[3]).toContain('005000')
      expect(sorted[4]).toContain('999999')
    })
  })

  describe('invalid counter values', () => {
    it('should throw error for counter value 0', () => {
      expect(() => generateOrderNumber(0)).toThrow('Must be a positive integer (>= 1)')
    })

    it('should throw error for negative counter values', () => {
      expect(() => generateOrderNumber(-1)).toThrow('Must be a positive integer (>= 1)')
      expect(() => generateOrderNumber(-100)).toThrow('Must be a positive integer (>= 1)')
    })

    it('should throw error for counter exceeding maximum (999999)', () => {
      expect(() => generateOrderNumber(1000000)).toThrow('exceeds maximum value of 999,999')
      expect(() => generateOrderNumber(9999999)).toThrow('exceeds maximum value of 999,999')
    })

    it('should throw error for non-integer counter values', () => {
      expect(() => generateOrderNumber(1.5)).toThrow('Must be an integer')
      expect(() => generateOrderNumber(100.1)).toThrow('Must be an integer')
    })

    it('should throw error for NaN', () => {
      expect(() => generateOrderNumber(NaN)).toThrow('Must be an integer')
    })

    it('should throw error for Infinity', () => {
      expect(() => generateOrderNumber(Infinity)).toThrow('Must be an integer')
    })
  })
})
