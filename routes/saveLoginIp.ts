/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { isIP } from 'node:net'
import { type Request, type Response, type NextFunction } from 'express'

import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import { auditLog } from '../lib/auditLog'

export function saveLoginIp () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.from(req)
    if (loggedInUser !== undefined) {
      /* The IP comes from the TCP connection; the client-controlled True-Client-IP header is never trusted */
      const remoteAddress = utils.toSimpleIpAddress(req.socket.remoteAddress ?? '')
      const lastLoginIp = isIP(remoteAddress) !== 0 ? remoteAddress : '0.0.0.0'
      const spoofedIp = req.headers['true-client-ip']
      try {
        const user = await UserModel.findByPk(loggedInUser.data.id)
        const updatedUser = await user?.update({ lastLoginIp })
        if (spoofedIp !== undefined) {
          auditLog('login_ip_header_ignored', req, { userId: loggedInUser.data.id, trueClientIpHeader: spoofedIp, savedIp: lastLoginIp }, 'warn')
        } else {
          auditLog('login_ip_saved', req, { userId: loggedInUser.data.id, savedIp: lastLoginIp })
        }
        /* Never return the password hash or the 2FA secret */
        const { password, totpSecret, ...safeUser } = updatedUser?.get({ plain: true }) ?? {}
        res.json(safeUser)
      } catch (error) {
        next(error)
      }
    } else {
      res.sendStatus(401)
    }
  }
}
