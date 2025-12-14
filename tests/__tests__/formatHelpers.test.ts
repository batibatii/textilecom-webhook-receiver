import { formatAddress } from '../../src/utils/formatHelpers'

describe('formatAddress', () => {
  describe('when all address fields are provided', () => {
    it('should format a complete address with line2', () => {
      const address = {
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'New York',
        postalCode: '10001',
        country: 'USA',
      }

      const result = formatAddress(address)

      expect(result).toBe('123 Main Street<br/>Apt 4B<br/>New York, 10001<br/>USA')
    })
  })

  describe('when optional fields are missing', () => {
    it('should format address without line2', () => {
      const address = {
        line1: '456 Oak Avenue',
        city: 'Los Angeles',
        postalCode: '90001',
        country: 'USA',
      }

      const result = formatAddress(address)

      expect(result).toBe('456 Oak Avenue<br/>Los Angeles, 90001<br/>USA')
    })

    it('should handle undefined line2', () => {
      const address = {
        line1: '789 Pine Road',
        line2: undefined,
        city: 'Chicago',
        postalCode: '60601',
        country: 'USA',
      }

      const result = formatAddress(address)

      expect(result).toBe('789 Pine Road<br/>Chicago, 60601<br/>USA')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string for line2', () => {
      const address = {
        line1: '321 Elm Street',
        line2: '',
        city: 'Boston',
        postalCode: '02101',
        country: 'USA',
      }

      const result = formatAddress(address)

      expect(result).toBe('321 Elm Street<br/>Boston, 02101<br/>USA')
    })
  })
})
