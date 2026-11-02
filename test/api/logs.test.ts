/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import type { Express } from 'express'
import * as security from '../../lib/insecurity'
import { createTestApp } from './helpers/setup'

let app: Express

const customerAuth = `Bearer ${security.authorize({ data: { role: security.roles.customer } })}`
const adminAuth = `Bearer ${security.authorize({ data: { role: security.roles.admin } })}`

async function waitForAccessLog (userAgents: string[]) {
  const logDirectory = path.resolve('logs')

  for (let attempt = 0; attempt < 40; attempt++) {
    const files = (await fs.readdir(logDirectory)).filter(file => file.startsWith('access.log.'))
    for (const file of files) {
      const contents = await fs.readFile(path.join(logDirectory, file), 'utf8')
      if (userAgents.every(userAgent => contents.includes(userAgent))) return contents
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  return ''
}

before(async () => {
  const result = await createTestApp()
  app = result.app
}, { timeout: 60000 })

void describe('/support/logs', () => {
  void it('rejects anonymous and non-admin access to the log listing and files', async () => {
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

  void it('allows an administrator to browse logs and rejects traversal filenames', async () => {
    const listing = await request(app)
      .get('/support/logs/')
      .set('Authorization', adminAuth)
    assert.equal(listing.status, 200)
    assert.ok(listing.text.includes('listing directory'))

    const traversal = await request(app)
      .get('/support/logs/%2e%2e%2fpackage.json')
      .set('Authorization', adminAuth)
    assert.ok(traversal.status === 403 || traversal.status === 404)

    const missingFile = await request(app)
      .get('/support/logs/access.log.2099-12-31')
      .set('Authorization', adminAuth)
    assert.equal(missingFile.status, 404)
    assert.deepEqual(missingFile.body.error, 'Request failed')
    assert.equal(JSON.stringify(missingFile.body).includes('logfileServer'), false)
    assert.ok(missingFile.body.requestId)
  })

  void it('records log listing requests, including normalized equivalent paths, with a request ID', async () => {
    const firstMarker = `PoC-LOG-05-normal-${crypto.randomUUID()}`
    const equivalentMarker = `PoC-LOG-05-equivalent-${crypto.randomUUID()}`

    const first = await request(app)
      .get('/support/logs/')
      .set('User-Agent', firstMarker)
    const equivalent = await request(app)
      .get('//support//logs//')
      .set('User-Agent', equivalentMarker)

    assert.equal(first.status, 401)
    assert.equal(equivalent.status, 401)
    assert.ok(first.headers['x-request-id'])
    assert.ok(equivalent.headers['x-request-id'])

    const log = await waitForAccessLog([firstMarker, equivalentMarker])
    assert.ok(log.includes(firstMarker))
    assert.ok(log.includes(equivalentMarker))
    assert.ok(log.includes(first.headers['x-request-id']))
    assert.ok(log.includes(equivalent.headers['x-request-id']))
  })
})
