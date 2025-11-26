import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import logger from '../common/logger'

/**
 * Middleware factory to validate request body against a Zod schema
 * @returns Express middleware function
 */
export const validateBody = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn({ errors: err.issues, path: req.path }, 'Request body validation failed')

        return res.status(400).json({
          error: 'Validation failed',
          details: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(err)
    }
  }
}

/**
 * Middleware factory to validate query parameters against a Zod schema
 * @returns Express middleware function
 */
export const validateQuery = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn({ errors: err.issues, path: req.path }, 'Query validation failed')

        return res.status(400).json({
          error: 'Validation failed',
          details: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(err)
    }
  }
}

/**
 * Middleware factory to validate route parameters against a Zod schema
 * @returns Express middleware function
 */
export const validateParams = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn({ errors: err.issues, path: req.path }, 'Params validation failed')

        return res.status(400).json({
          error: 'Validation failed',
          details: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(err)
    }
  }
}
