/**
 * Shared Supabase admin client for scripts.
 * Reads from .env.local — make sure you're pointing at the DEV project.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌  .env.local not found')
  process.exit(1)
}
dotenv.config({ path: envPath })

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anon) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

// Warn loudly if this looks like the production project
if (url.includes('bvlvpucjyoovrdactnew') && process.env.ALLOW_PROD_SEEDING !== 'true') {
  console.error('\n⚠️  SAFETY CHECK FAILED')
  console.error('   .env.local is pointing at the PRODUCTION Supabase project.')
  console.error('   Switch to your DEV project before running seed/simulate scripts.')
  console.error('   To override for a one-time prod run, set ALLOW_PROD_SEEDING=true in .env.local\n')
  process.exit(1)
}

if (url.includes('bvlvpucjyoovrdactnew') && process.env.ALLOW_PROD_SEEDING === 'true') {
  console.log('⚠️  Running against PRODUCTION (ALLOW_PROD_SEEDING=true). Remember to run teardown after.\n')
}

if (!serviceKey) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  console.error('   Add it from: Supabase dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

/** Admin client — can create users, bypass RLS */
export const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** Anon client — respects RLS */
export const anonClient = createClient(url, anon)

export const SUPABASE_URL = url
