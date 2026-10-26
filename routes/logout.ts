/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response } from 'express'
import * as security from '../lib/insecurity'
import * as utils from '../lib/utils'

export function logout () {
  return (req: Request, res: Response) => {
    const token = req.cookies.token ?? utils.jwtFrom(req)
    if (token) {
      delete security.authenticatedUsers.tokenMap[utils.unquote(token)]
    }
    /* The cookie is HttpOnly, so only the server can remove it */
    security.clearSessionCookie(res)
    res.status(204).send()
  }
}
