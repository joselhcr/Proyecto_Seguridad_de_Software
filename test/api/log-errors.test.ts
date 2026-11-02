/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import type { Express } from 'express'
import * as security from '../../lib/insecurity'
import { createTestApp } from './helpers/setup'

let app: Express
const adminAuth = `Bearer ${security.authorize({ data: { role: security.roles.admin } })}`

before(async () => {
  const result = await createTestApp()
  app = result.app
}, { timeout: 60000 })

void describe('/support/logs error responses', () => {
  void it('returns a generic response for a missing file and preserves its status', async () => {
    const res = await request(app)
      .get('/support/logs/access.log.2099-12-31')
      .set('Authorization', adminAuth)

    assert.equal(res.status, 404)
    assert.deepEqual(res.body, { error: 'Request failed', requestId: res.headers['x-request-id'] })
    assert.equal(JSON.stringify(res.body).includes('access.log.2099-12-31'), false)
    assert.equal(JSON.stringify(res.body).includes('ENOENT'), false)
  })
})
