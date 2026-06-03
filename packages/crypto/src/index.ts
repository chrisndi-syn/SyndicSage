// ── Field-level encryption ────────────────────────────────────
// AES-256-GCM wrapper for sensitive PII fields.
//
// Interface is deliberately stable: if we later move to Supabase Vault
// or a dedicated KMS, only this file changes — all callers stay identical.
//
// Fields encrypted: owner.national_id, owner.bank_account, profile.phone
//
// Required env var:
//   ENCRYPTION_KEY — 64-char hex string (32 bytes)
//   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Wire format (stored in DB as plain TEXT):
//   <iv_hex>:<authTag_hex>:<ciphertext_hex>

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { EncryptedString } from '@syndicsage/types'

const ALGORITHM  = 'aes-256-gcm'
const IV_BYTES   = 12   // 96-bit IV — GCM standard
const TAG_BYTES  = 16   // 128-bit authentication tag

function getKey(): Buffer {
  const hex = process.env['ENCRYPTION_KEY']
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(value: string): EncryptedString {
  const key    = getKey()
  const iv     = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag        = cipher.getAuthTag()

  // Colon-delimited hex segments — safe for TEXT storage, no encoding ambiguity
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}` as unknown as EncryptedString
}

export function decrypt(value: EncryptedString): string {
  const key    = getKey()
  const raw    = value as unknown as string
  const parts  = raw.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value — expected <iv>:<tag>:<ciphertext> format')
  }

  const [ivHex, tagHex, ctHex] = parts as [string, string, string]
  const iv         = Buffer.from(ivHex,  'hex')
  const tag        = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ctHex,  'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// Safe decrypt: returns null instead of throwing if the value is null/undefined.
// Use for optional encrypted fields when reading from DB.
export function decryptNullable(value: EncryptedString | null | undefined): string | null {
  if (value == null) return null
  return decrypt(value)
}
