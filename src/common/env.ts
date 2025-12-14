import dotenv from 'dotenv'

let envFile = '.env.local'
if (process.env.NODE_ENV === 'production') {
  envFile = '.env.prod'
} else if (process.env.NODE_ENV === 'test') {
  envFile = '.env.test'
}
dotenv.config({ path: envFile })
