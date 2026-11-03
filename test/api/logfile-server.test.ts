/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import type { Express } from 'express'
import * as utils from '../../lib/utils'
import * as security from '../../lib/insecurity'
import { createTestApp } from './helpers/setup'

let app: Express
const adminAuth = `Bearer ${security.authorize({ data: { role: security.roles.admin } })}`

before(async () => {
  const result = await createTestApp()
  app = result.app
}, { timeout: 60000 })

void describe('/support/logs/:file', () => {
  void it('GET access log file for the current day', async () => {
    const res = await request(app)
      .get('/support/logs/access.log.' + utils.toISO8601(new Date()))
      .set('Authorization', adminAuth)

    assert.equal(res.status, 200)
    assert.ok(res.headers['content-type']?.includes('application/octet-stream'))
  })

  void it('GET log file whose name contains a forward slash returns no file details', async () => {
    const res = await request(app)
      .get('/support/logs/%2fetc%2fpasswd')
      .set('Authorization', adminAuth)

    assert.equal(res.status, 404)
    assert.equal(res.text.includes('Error:'), false)
  })
})
