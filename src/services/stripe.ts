import Stripe from 'stripe'
import '../common/env'

const stripe = new Stripe(process.env.STRIPE_API_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET

export { stripe, endpointSecret }
