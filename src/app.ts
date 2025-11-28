import './common/env'
import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import unknownEndpoint from './middlewares/unknownEndpoint'
import errorHandler from './middlewares/errorHandler'
import webHooksController from '../src/resources/stripe/webhooks/controller'

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

// https://github.com/stripe/stripe-node/issues/341
app.post('/v1/stripe/webhooks', express.raw({ type: 'application/json' }), webHooksController.receiveUpdates)

app.use(express.json())

// health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    'health-check': 'This is working!',
  })
})

app.use('*', unknownEndpoint)

// Global error handler - must be last
app.use(errorHandler)

export default app
