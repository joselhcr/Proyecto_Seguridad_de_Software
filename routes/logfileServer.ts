/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'node:path'
import { type Request, type Response, type NextFunction } from 'express'

export function serveLogFiles () {
  return ({ params }: Request, res: Response, next: NextFunction) => {
    const file = params.file

    if (!/^access\.log\.\d{4}-\d{2}-\d{2}$/.test(file) || path.basename(file) !== file || file.includes('\\')) {
      res.status(404).end()
      return
    }

    res.sendFile(file, { root: path.resolve('logs') }, (err) => {
      if (err) next(err)
    })
  }
}
