import { Request, Response, NextFunction } from 'express'
import logger from '../common/logger'

interface CustomError extends Error {
  statusCode?: number
  status?: number
}

interface RequestWithId extends Request {
  id?: string
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

const PRODUCTION_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
}

const errorHandler = (err: CustomError, req: RequestWithId, res: Response, next: NextFunction) => {
  const requestId = req.id || generateRequestId()

  // Log full error details server-side (with stack trace)
  logger.error(
    {
      err,
      requestId,
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      },
    },
    'Unhandled error occurred',
  )

  const statusCode = err.statusCode || err.status || 500
  const isDevelopment = process.env.NODE_ENV === 'development'

  const errorMessage = isDevelopment
    ? err.message || 'Internal Server Error'
    : PRODUCTION_ERROR_MESSAGES[statusCode] || 'An error occurred'

  res.status(statusCode).json({
    error: {
      message: errorMessage,
      requestId,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack }),
    },
  })
}

export default errorHandler
