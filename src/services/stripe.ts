import Stripe from 'stripe'
import '../common/env'

if (!process.env.STRIPE_API_KEY) {
  throw new Error('STRIPE_API_KEY is required but not defined in environment variables')
}

if (!process.env.STRIPE_WEBHOOK_SIGNING_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SIGNING_SECRET is required but not defined in environment variables')
}

const stripe = new Stripe(process.env.STRIPE_API_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET

export { stripe, endpointSecret }
