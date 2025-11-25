require('dotenv').config({ path: '.env.local' })

if (!process.env.STRIPE_API_KEY) {
  process.env.STRIPE_API_KEY = 'sk_test_dummy_key_for_testing'
}

if (!process.env.STRIPE_WEBHOOK_SIGNING_SECRET) {
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET = 'whsec_dummy_secret_for_testing'
}
