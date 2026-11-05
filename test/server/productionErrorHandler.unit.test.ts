/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { productionErrorHandler } from '../../lib/productionErrorHandler'

void describe('productionErrorHandler', () => {
  void it('returns a generic error and correlation ID without exposing internal details', () => {
    let status = 0
    let body: Record<string, unknown> = {}
    const headers: Record<string, string> = { 'X-Request-Id': 'request-123' }
    const res = {
      headersSent: false,
      getHeader: (name: string) => headers[name],
      setHeader: (name: string, value: string) => { headers[name] = value },
      status: (code: number) => {
        status = code
        return res
      },
      json: (response: Record<string, unknown>) => {
        body = response
        return res
      }
    } as unknown as Response

    productionErrorHandler(new Error('private filesystem path'), {
      method: 'GET',
      path: '/support/logs/private.log',
      socket: { remoteAddress: '127.0.0.1' }
    } as unknown as Request, res, (() => {}) as NextFunction)

    assert.equal(status, 500)
    assert.deepEqual(body, { error: 'Request failed', requestId: 'request-123' })
    assert.equal(JSON.stringify(body).includes('private filesystem path'), false)
  })

  void it('preserves an HTTP error status without returning the internal message', () => {
    let status = 0
    let body: Record<string, unknown> = {}
    const res = {
      headersSent: false,
      getHeader: () => undefined,
      setHeader: () => {},
      status: (code: number) => {
        status = code
        return res
      },
      json: (response: Record<string, unknown>) => {
        body = response
        return res
      }
    } as unknown as Response

    productionErrorHandler({ status: 404, message: 'private file path' }, {
      method: 'GET',
      path: '/support/logs/missing.log',
      socket: { remoteAddress: '127.0.0.1' }
    } as unknown as Request, res, (() => {}) as NextFunction)

    assert.equal(status, 404)
    assert.equal(body.error, 'Request failed')
    assert.equal(JSON.stringify(body).includes('private file path'), false)
    assert.ok(typeof body.requestId === 'string')
  })
})
