/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import { UserModel } from '../models/user'
import * as security from '../lib/insecurity'
import { auditLog } from '../lib/auditLog'

export function changePassword () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { query, headers, connection } = req
    const currentPassword = query.current as string
    const newPassword = query.new as string
    const newPasswordInString = newPassword?.toString()
    const repeatPassword = query.repeat

    if (!newPassword || newPassword === 'undefined') {
      res.status(401).send(res.__('Password cannot be empty.'))
      return
    } else if (newPassword !== repeatPassword) {
      res.status(401).send(res.__('New and repeated password do not match.'))
      return
    }

    const token = headers.authorization ? headers.authorization.substr('Bearer='.length) : null
    if (token === null) {
      next(new Error('Blocked illegal activity by ' + connection.remoteAddress))
      return
    }

    const loggedInUser = security.authenticatedUsers.get(token)
    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + connection.remoteAddress))
      return
    }

    try {
      const user = await UserModel.findByPk(loggedInUser.data.id)
      if (!user) {
        res.status(404).send(res.__('User not found.'))
        return
      }

      /* The current password is always required and is compared with the stored hash, so a stolen session cannot change it */
      if (!security.verifyPassword(currentPassword, user.password)) {
        auditLog('password_change_denied', req, { userId: user.id }, 'warn')
        res.status(401).send(res.__('Current password is not correct.'))
        return
      }

      await user.update({ password: newPasswordInString })
      res.json({ user: security.withoutCredentials(user) })
    } catch (error) {
      next(error)
    }
  }
}
