import type { NextFunction, Request, Response } from 'express'
import { HttpError, ValidationError } from '../lib/errors'
import { logger } from '../lib/logger'

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({ error: err.code, details: err.details })
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code })
  }

  logger.error({ err, path: req.path }, 'unhandled error')
  res.status(500).json({ error: 'internal_error' })
}
