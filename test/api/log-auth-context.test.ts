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

async function waitForLine (filePath: string, requestId: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const content = await fs.readFile(filePath, 'utf8').catch(() => '')
    const line = content.split('\n').find(entry => entry.includes(requestId))
    if (line) return line
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  return ''
}

async function waitForAccessLine (requestId: string) {
  const logDirectory = path.resolve('logs')
  for (let attempt = 0; attempt < 40; attempt++) {
    const files = (await fs.readdir(logDirectory)).filter(file => file.startsWith('access.log.'))
    for (const file of files) {
      const content = await fs.readFile(path.join(logDirectory, file), 'utf8')
      const line = content.split('\n').find(entry => entry.includes(requestId))
      if (line) return line
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  return ''
}

before(async () => {
  const result = await createTestApp()
  app = result.app
}, { timeout: 60000 })

void describe('PoC-LOG-02 authentication audit context', () => {
  void it('correlates a rejected SQL injection login without logging its password or a token', async () => {
    const marker = `PoC-LOG-02-${crypto.randomUUID()}`
    const password = `PoC-LOG-02-secret-${crypto.randomUUID()}`
    const response = await request(app)
      .post('/rest/user/login')
      .set('User-Agent', marker)
      .send({ email: "' OR 1=1--", password })

    assert.equal(response.status, 401)
    assert.equal(response.body.authentication?.token, undefined)

    const requestId = response.headers['x-request-id']
    assert.ok(requestId)

    const authLine = await waitForLine(path.resolve('logs/auth.log'), requestId)
    const accessLine = await waitForAccessLine(requestId)

    assert.ok(authLine.includes('login_attempt'))
    assert.ok(authLine.includes('invalid_credentials'))
    assert.ok(authLine.includes(marker))
    assert.ok(accessLine.includes('POST /rest/user/login'))
    assert.ok(accessLine.includes('401'))
    assert.ok(accessLine.includes(marker))
    assert.equal(authLine.includes(password), false)
    assert.equal(accessLine.includes(password), false)
  })
})
