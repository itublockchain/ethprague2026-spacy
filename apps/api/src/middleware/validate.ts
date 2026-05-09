import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { ValidationError } from '../lib/errors'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return next(new ValidationError(result.error.flatten()))
    req.body = result.data
    next()
  }
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success) return next(new ValidationError(result.error.flatten()))
    Object.assign(req.params, result.data as Record<string, string>)
    next()
  }
}
