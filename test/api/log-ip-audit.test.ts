/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import type { Express } from 'express'
import { createTestApp } from './helpers/setup'

let app: Express

async function waitForLogLine (marker: string) {
  const logDirectory = path.resolve('logs')

  for (let attempt = 0; attempt < 40; attempt++) {
    const files = (await fs.readdir(logDirectory)).filter(file => file.startsWith('access.log.'))
    for (const file of files) {
      const contents = await fs.readFile(path.join(logDirectory, file), 'utf8')
      const line = contents.split(/\r?\n/).find(logLine => logLine.includes(marker))
      if (line) return line
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  return ''
}

before(async () => {
  const trustedProxy = process.env.TRUSTED_PROXY
  delete process.env.TRUSTED_PROXY

  try {
    const result = await createTestApp()
    app = result.app
  } finally {
    if (trustedProxy !== undefined) process.env.TRUSTED_PROXY = trustedProxy
  }
}, { timeout: 60000 })

void describe('LOG-04 access log client IP', () => {
  void it('does not trust a client-supplied X-Forwarded-For without a configured proxy', async () => {
    const spoofedIp = '203.0.113.41'
    const userAgent = `PoC-LOG-04-XFF-${crypto.randomUUID()}`
    const response = await request(app)
      .get('/rest/admin/application-version')
      .set('User-Agent', userAgent)
      .set('X-Forwarded-For', spoofedIp)

    assert.equal(response.status, 200)

    const logLine = await waitForLogLine(userAgent)
    assert.ok(logLine.includes(userAgent))
    assert.equal(logLine.includes(spoofedIp), false)
  })
})
