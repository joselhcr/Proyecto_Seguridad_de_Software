/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { auditLog } from './auditLog'

export function productionErrorHandler (err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err)
  }

  const errorStatus = typeof err === 'object' && err !== null ? err as { status?: number, statusCode?: number } : {}
  const status = [errorStatus.statusCode, errorStatus.status].find((code) => Number.isInteger(code) && code! >= 400 && code! < 600) ?? 500
  const requestId = String(res.getHeader('X-Request-Id') ?? crypto.randomUUID())

  auditLog('request_failed', req, {
    requestId,
    status,
    errorType: err instanceof Error ? err.name : 'UnknownError'
  }, 'warn')

  res.setHeader('X-Request-Id', requestId)
  res.status(status).json({ error: 'Request failed', requestId })
}
