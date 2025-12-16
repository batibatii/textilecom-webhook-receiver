import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

interface RequestWithId extends Request {
  id?: string
}
export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()

  req.id = requestId

  // Return in response header for client correlation
  res.setHeader('X-Request-Id', requestId)

  next()
}
