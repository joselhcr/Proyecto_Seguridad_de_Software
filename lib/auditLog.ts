/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import crypto from 'node:crypto'
import { type Request } from 'express'
import logger from './logger'

/* Without a configured key, a random one is used: signatures can then only be verified while this process runs */
const signingKey = process.env.AUDIT_LOG_KEY ?? crypto.randomBytes(32).toString('hex')
if (process.env.AUDIT_LOG_KEY === undefined) {
  logger.warn('AUDIT_LOG_KEY is not set; audit log signatures use a temporary key')
}

const maxValueLength = 200

/* Replaces line breaks and other control characters so a value can never split or forge a log entry */
export const sanitizeForLog = (value: unknown) => String(value ?? '').replace(/\p{Cc}/gu, ' ').slice(0, maxValueLength)

export const signAuditEntry = (entry: string) => crypto.createHmac('sha256', signingKey).update(entry).digest('hex')

export const verifyAuditEntry = (entry: string, signature: string) => {
  const expected = Buffer.from(signAuditEntry(entry), 'hex')
  const received = Buffer.from(signature, 'hex')
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export function auditLog (event: string, req: Request, details: Record<string, unknown> = {}, level: 'info' | 'warn' = 'info') {
  const sanitizedDetails: Record<string, string> = {}
  for (const [key, value] of Object.entries(details)) {
    sanitizedDetails[sanitizeForLog(key)] = sanitizeForLog(value)
  }
  /* The IP comes from the TCP connection, never from client-controlled headers such as X-Forwarded-For or True-Client-IP */
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: sanitizeForLog(event),
    ip: sanitizeForLog(req.socket.remoteAddress),
    method: req.method,
    path: sanitizeForLog(req.path),
    details: sanitizedDetails
  })
  logger.log(level, `AUDIT ${entry} signature=${signAuditEntry(entry)}`)
}
