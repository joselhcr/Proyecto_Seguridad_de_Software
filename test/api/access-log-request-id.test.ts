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
import { createTestApp } from './helpers/setup'

let app: Express

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

void describe('HTTP access audit', () => {
  void it('records early responses and normalized paths with unique request IDs', async () => {
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
    assert.notEqual(first.headers['x-request-id'], equivalent.headers['x-request-id'])

    const log = await waitForAccessLog([firstMarker, equivalentMarker])
    assert.ok(log.includes(firstMarker))
    assert.ok(log.includes(equivalentMarker))
    assert.ok(log.includes(first.headers['x-request-id']))
    assert.ok(log.includes(equivalent.headers['x-request-id']))
  })
})
