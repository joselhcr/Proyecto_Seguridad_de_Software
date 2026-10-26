/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import crypto from 'node:crypto'
import path from 'node:path'
import { type Request } from 'express'
import * as winston from 'winston'

const auditLog = winston.createLogger({
  transports: [new winston.transports.File({ filename: path.resolve('logs/auth.log') })],
  format: winston.format.printf(({ message }) => String(message))
})

/* Each entry is signed with an HMAC that also covers the previous signature, so deleting or editing a line breaks the chain */
const signingKey = process.env.AUDIT_LOG_KEY ?? crypto.randomBytes(32).toString('hex')
let previousSignature = 'genesis'

const failedAttempts = new Map<string, number[]>()
const bruteForceWindowMs = 10 * 60 * 1000
const bruteForceThreshold = 5

/* Control characters (CR, LF, tabs...) are removed and the length is capped, so a value can never create a fake log line */
export const sanitizeForLog = (value: unknown, maxLength = 254) => String(value ?? '').replace(/\p{Cc}/gu, '').slice(0, maxLength)

/* The address comes from the TCP connection, never from headers like X-Forwarded-For or True-Client-IP that the client controls */
export const clientIp = (req: Request) => sanitizeForLog(req.socket.remoteAddress ?? 'unknown', 64)

function write (level: 'info' | 'warn', entry: Record<string, unknown>) {
  const record = { timestamp: new Date().toISOString(), level, ...entry, prev: previousSignature }
  const signature = crypto.createHmac('sha256', signingKey).update(JSON.stringify(record)).digest('hex')
  previousSignature = signature
  auditLog.log(level, JSON.stringify({ ...record, signature }))
}

function trackFailure (ip: string, requestId: string) {
  const now = Date.now()
  const recent = (failedAttempts.get(ip) ?? []).filter((time) => now - time < bruteForceWindowMs)
  recent.push(now)
  failedAttempts.set(ip, recent)
  if (recent.length === bruteForceThreshold) {
    write('warn', { event: 'brute_force_suspected', ip, failures: recent.length, windowMinutes: bruteForceWindowMs / 60000, requestId })
  }
}

export function logAuthEvent (req: Request, event: 'login_attempt' | 'login_2fa_attempt', success: boolean, details: { email?: unknown, userId?: number, reason?: string, requestId: string }) {
  const ip = clientIp(req)
  write(success ? 'info' : 'warn', {
    event,
    success,
    email: sanitizeForLog(details.email),
    userId: details.userId,
    reason: details.reason,
    ip,
    userAgent: sanitizeForLog(req.headers['user-agent'], 200),
    requestId: details.requestId
  })
  if (!success) {
    trackFailure(ip, details.requestId)
  }
}
