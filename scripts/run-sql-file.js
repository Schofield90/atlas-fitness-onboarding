#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  const sqlPath = process.argv[2]
  if (!sqlPath) {
    console.error('Usage: node scripts/run-sql-file.js path/to/file.sql')
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(sqlPath)
    ? sqlPath
    : path.join(process.cwd(), sqlPath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`SQL file not found: ${absolutePath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(absolutePath, 'utf8')

  // Prefer DATABASE_URL from env; fallback to pooler used elsewhere in repo
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@aws-0-eu-west-2.pooler.supabase.com:6543/postgres'

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    console.log(`🔧 Connecting to database...`)
    await client.connect()
    console.log(`✅ Connected. Running: ${path.basename(absolutePath)}`)
    await client.query(sql)
    console.log('✅ Migration executed successfully')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

