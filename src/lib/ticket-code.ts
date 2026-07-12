import 'server-only'
import { randomInt } from 'node:crypto'

// チケットコード: 8桁の小文字英数字（紛らわしい i/l/o/0/1 を除いた31種類 ≒ 8,500億通り）
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function newTicketCode(): string {
  return Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')
}
