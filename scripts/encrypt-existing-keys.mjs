#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return Buffer.from(key, 'hex')
}

function encrypt(text) {
  if (!text) return text

  const key = getEncryptionKey()
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let totalEncrypted = 0
  let alreadyEncrypted = 0
  let errors = 0

  // Encrypt Stripe Connect accounts
  console.log('📦 Processing Stripe Connect accounts...')
  const { data: stripeAccounts, error: stripeError } = await supabase
    .from('stripe_connect_accounts')
    .select('organization_id, access_token')
    .not('access_token', 'is', null)

  if (stripeError) {
    console.error('❌ Error fetching Stripe accounts:', stripeError)
    errors++
  } else if (stripeAccounts) {
    for (const account of stripeAccounts) {
      if (isEncrypted(account.access_token)) {
        console.log(`  ⏭️  Org ${account.organization_id}: Already encrypted`)
        alreadyEncrypted++
        continue
      }

      const encryptedToken = encrypt(account.access_token)
      const { error: updateError } = await supabase
        .from('stripe_connect_accounts')
        .update({ access_token: encryptedToken })
        .eq('organization_id', account.organization_id)

      if (updateError) {
        console.error(`  ❌ Org ${account.organization_id}: Failed to encrypt`, updateError)
        errors++
      } else {
        console.log(`  ✅ Org ${account.organization_id}: Encrypted successfully`)
        totalEncrypted++
      }
    }
  }

  // Encrypt Payment Provider accounts
  console.log('\n📦 Processing Payment Provider accounts...')
  const { data: paymentAccounts, error: paymentError } = await supabase
    .from('payment_provider_accounts')
    .select('id, organization_id, provider, access_token')
    .not('access_token', 'is', null)

  if (paymentError) {
    console.error('❌ Error fetching payment accounts:', paymentError)
    errors++
  } else if (paymentAccounts) {
    for (const account of paymentAccounts) {
      if (isEncrypted(account.access_token)) {
        console.log(`  ⏭️  ${account.provider} - Org ${account.organization_id}: Already encrypted`)
        alreadyEncrypted++
        continue
      }

      const encryptedToken = encrypt(account.access_token)
      const { error: updateError } = await supabase
        .from('payment_provider_accounts')
        .update({ access_token: encryptedToken })
        .eq('id', account.id)

      if (updateError) {
        console.error(`  ❌ ${account.provider} - Org ${account.organization_id}: Failed to encrypt`, updateError)
        errors++
      } else {
        console.log(`  ✅ ${account.provider} - Org ${account.organization_id}: Encrypted successfully`)
        totalEncrypted++
      }
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  console.log(`  ✅ Newly encrypted: ${totalEncrypted}`)
  console.log(`  ⏭️  Already encrypted: ${alreadyEncrypted}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log('\n✨ Encryption migration complete!')
}

main().catch(console.error)
