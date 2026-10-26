/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import config from 'config'

/* The browser always sends Origin (or Referer) with a form POST, and a third-party page cannot forge it */
function isSameOrigin (req: Request) {
  const source = req.headers.origin ?? req.headers.referer
  try {
    return source !== undefined && new URL(source).host === req.headers.host
  } catch {
    return false
  }
}

export function updateUserProfile () {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isSameOrigin(req)) {
      res.status(403).json({ error: 'Cross-origin request blocked' })
      return
    }

    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)

    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
      return
    }

    try {
      const user = await UserModel.findByPk(loggedInUser.data.id)
      if (!user) {
        next(new Error('User not found'))
        return
      }

      challengeUtils.solveIf(challenges.csrfChallenge, () => {
        const url = config.get<string>('challenges.overwriteUrlForCsrfChallenge')
        return ((req.headers.origin?.includes('://' + url.replace(/^https?:\/\//, ''))) ??
          (req.headers.referer?.includes('://' + url.replace(/^https?:\/\//, '')))) &&
          req.body.username !== user.username
      })

      const savedUser = await user.update({ username: req.body.username })
      const userWithStatus = utils.queryResultToJson(savedUser)
      const updatedToken = security.authorize(userWithStatus)
      security.authenticatedUsers.put(updatedToken, userWithStatus)
      res.cookie('token', updatedToken)
      res.location(process.env.BASE_PATH + '/profile')
      res.redirect(process.env.BASE_PATH + '/profile')
    } catch (error) {
      next(error)
    }
  }
}
