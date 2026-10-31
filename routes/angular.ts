/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'node:path'
import { type Request, type Response, type NextFunction } from 'express'

/* Only scripts served by the application itself may run; inline scripts injected via XSS are blocked by the browser */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'"
].join('; ')

export function setContentSecurityPolicy (res: Response, filePath: string) {
  if (filePath.endsWith('index.html')) {
    res.setHeader('Content-Security-Policy', contentSecurityPolicy)
  }
}

export function serveAngularClient () {
  return ({ url }: Request, res: Response, next: NextFunction) => {
    if (!url.startsWith('/api') && !url.startsWith('/rest')) {
      res.setHeader('Content-Security-Policy', contentSecurityPolicy)
      res.sendFile(path.resolve('frontend/dist/frontend/index.html'))
    } else {
      next(new Error('Unexpected path: ' + url))
    }
  }
}
