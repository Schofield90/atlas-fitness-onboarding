#!/usr/bin/env node

import pg from 'pg'
import crypto from 'crypto'

const { Client } = pg

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const ENCRYPTION_KEY = '537d6ac1283452cdf446f52c07fbb15fca16330a7cbb95ed373aa32219674ffb'

function encrypt(text) {
  if (!text) return text

  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':')
}

function isEncrypted(text) {
  if (!text) return false
  const parts = text.split(':')
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part))
}

async function main() {
  console.log('🔐 Encrypting existing API keys in database...\n')

  const client = new Client({
    host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '@Aa80236661',
  })

  await client.connect()

  let totalEncrypted = 0
  let alreadyEncrypted = 0

  try {
    // Encrypt Stripe Connect accounts
    console.log('📦 Processing Stripe Connect accounts...')
    const stripeResult = await client.query(
      'SELECT organization_id, access_token FROM stripe_connect_accounts WHERE access_token IS NOT NULL'
    )

    for (const row of stripeResult.rows) {
      if (isEncrypted(row.access_token)) {
        console.log(`  ⏭️  Org ${row.organization_id}: Already encrypted`)
        alreadyEncrypted++
        continue
      }

      const encryptedToken = encrypt(row.access_token)
      await client.query(
        'UPDATE stripe_connect_accounts SET access_token = $1 WHERE organization_id = $2',
        [encryptedToken, row.organization_id]
      )
      console.log(`  ✅ Org ${row.organization_id}: Encrypted successfully`)
      totalEncrypted++
    }

    // Encrypt Payment Provider accounts
    console.log('\n📦 Processing Payment Provider accounts...')
    const paymentResult = await client.query(
      'SELECT id, organization_id, provider, access_token FROM payment_provider_accounts WHERE access_token IS NOT NULL'
    )

    for (const row of paymentResult.rows) {
      if (isEncrypted(row.access_token)) {
        console.log(`  ⏭️  ${row.provider} - Org ${row.organization_id}: Already encrypted`)
        alreadyEncrypted++
        continue
      }

      const encryptedToken = encrypt(row.access_token)
      await client.query(
        'UPDATE payment_provider_accounts SET access_token = $1 WHERE id = $2',
        [encryptedToken, row.id]
      )
      console.log(`  ✅ ${row.provider} - Org ${row.organization_id}: Encrypted successfully`)
      totalEncrypted++
    }

    console.log('\n📊 Summary:')
    console.log(`  ✅ Newly encrypted: ${totalEncrypted}`)
    console.log(`  ⏭️  Already encrypted: ${alreadyEncrypted}`)
    console.log('\n✨ Encryption migration complete!')

  } finally {
    await client.end()
  }
}

main().catch(console.error)
