import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import userRoutes from './common/routes'
import unknownEndpoint from './middlewares/unknownEndpoint'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// middleware
app.disable('x-powered-by')
app.use(cors())
app.use(helmet())
app.use(compression())
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.REQUEST_LIMIT || '100kb',
  }),
)
app.use(express.json())

// health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    'health-check': 'This is working!',
  })
})

app.use('/v1/', userRoutes)

// Handle unknown endpoints
app.use('*', unknownEndpoint)

export default app
