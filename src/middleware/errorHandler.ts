import { Request, Response, NextFunction } from 'express'
import logger from '../common/logger'

interface CustomError extends Error {
  statusCode?: number
  status?: number
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  }, 'Unhandled error occurred')

  const statusCode = err.statusCode || err.status || 500

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}

export default errorHandler
