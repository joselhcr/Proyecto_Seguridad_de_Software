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

const customerAuth = `Bearer ${security.authorize({ data: { role: security.roles.customer } })}`
const adminAuth = `Bearer ${security.authorize({ data: { role: security.roles.admin } })}`

before(async () => {
  const result = await createTestApp()
  app = result.app
}, { timeout: 60000 })

void describe('/support/logs', () => {
  void it('rejects anonymous and non-admin access to the listing and log files', async () => {
    const anonymousListing = await request(app).get('/support/logs/')
    assert.equal(anonymousListing.status, 401)

    const customerListing = await request(app)
      .get('/support/logs/')
      .set('Authorization', customerAuth)
    assert.equal(customerListing.status, 403)

    const anonymousFile = await request(app).get('/support/logs/access.log.2026-01-01')
    assert.equal(anonymousFile.status, 401)

    const customerFile = await request(app)
      .get('/support/logs/access.log.2026-01-01')
      .set('Authorization', customerAuth)
    assert.equal(customerFile.status, 403)
  })

  void it('allows administrators to browse logs', async () => {
    const listing = await request(app)
      .get('/support/logs/')
      .set('Authorization', adminAuth)

    assert.equal(listing.status, 200)
  })

  void it('rejects traversal filenames without exposing filesystem details', async () => {
    const traversal = await request(app)
      .get('/support/logs/%2e%2e%2fpackage.json')
      .set('Authorization', adminAuth)

    assert.ok(traversal.status === 403 || traversal.status === 404)
    assert.equal(traversal.text.includes('package.json'), false)
  })
})
