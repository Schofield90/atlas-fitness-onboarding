import { randomBytes } from 'crypto'

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

export function generateNumericCode(length: number = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}