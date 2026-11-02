/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import crypto from 'node:crypto'
import logger from './logger'

/* Without a configured key, a random one is used: this is safe here because the database is recreated at every startup */
const encryptionKey = crypto.createHash('sha256').update(process.env.CARD_ENCRYPTION_KEY || crypto.randomBytes(32)).digest()
if (!process.env.CARD_ENCRYPTION_KEY) {
  logger.warn('CARD_ENCRYPTION_KEY is not set; card numbers are encrypted with a temporary key')
}

const algorithm = 'aes-256-gcm'
const ivLength = 12

/* A random IV per value means two equal card numbers never produce the same stored text */
export const encryptCardNumber = (cardNumber: string) => {
  const iv = crypto.randomBytes(ivLength)
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(cardNumber, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join(':')
}

export const decryptCardNumber = (storedValue: string) => {
  const [iv, authTag, encrypted] = storedValue.split(':').map(part => Buffer.from(part, 'base64'))
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export const maskCardNumber = (cardNumber: string) => '*'.repeat(12) + cardNumber.substring(cardNumber.length - 4)
