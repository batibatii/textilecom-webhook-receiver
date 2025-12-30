import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '../common/logger'

interface RequestWithId extends Request {
  id?: string
  startTime?: number
}

export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  const startTime = Date.now()

  req.id = requestId
  req.startTime = startTime

  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info(
      {
        requestId,
        duration,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      },
      `Request completed in ${duration}ms`,
    )
  })

  // Return in response header for client correlation
  res.setHeader('X-Request-Id', requestId)

  next()
}
