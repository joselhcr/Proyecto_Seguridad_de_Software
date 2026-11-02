/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import {
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  DataTypes,
  type CreationOptional,
  type Sequelize
} from 'sequelize'
import { decryptCardNumber, encryptCardNumber, maskCardNumber } from '../lib/cardEncryption'

class Card extends Model<
InferAttributes<Card>,
InferCreationAttributes<Card>
> {
  declare UserId: number
  declare id: CreationOptional<number>
  declare fullName: string
  declare cardNum: string
  declare expMonth: number
  declare expYear: number

  /* Any automatic API response only ever gets the masked number */
  toJSON () {
    return { ...this.get({ plain: true }), cardNum: maskCardNumber(this.cardNum) }
  }
}

const CardModelInit = (sequelize: Sequelize) => {
  Card.init(
    {
      UserId: {
        type: DataTypes.INTEGER
      },
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      fullName: DataTypes.STRING,
      /* Only the encrypted value reaches the database, so the validation decrypts it to check the number */
      cardNum: {
        type: DataTypes.STRING,
        set (cardNum: string | number) {
          this.setDataValue('cardNum', encryptCardNumber(String(cardNum)))
        },
        get () {
          const storedValue = this.getDataValue('cardNum')
          return storedValue ? decryptCardNumber(storedValue) : storedValue
        },
        validate: {
          isValidCardNumber (storedValue: string) {
            const cardNumber = Number(decryptCardNumber(storedValue))
            if (!Number.isInteger(cardNumber) || cardNumber < 1000000000000000 || cardNumber > 9999999999999998) {
              throw new Error('Invalid card number')
            }
          }
        }
      },
      expMonth: {
        type: DataTypes.INTEGER,
        validate: {
          isInt: true,
          min: 1,
          max: 12
        }
      },
      expYear: {
        type: DataTypes.INTEGER,
        validate: {
          isInt: true,
          min: 2080,
          max: 2099
        }
      }
    },
    {
      tableName: 'Cards',
      sequelize
    }
  )
}

export { Card as CardModel, CardModelInit }
