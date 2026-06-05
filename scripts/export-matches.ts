/**
 * npm run export-matches
 *
 * Exports teams + matches from the PRODUCTION database and writes a SQL file
 * you can paste into the DEV Supabase SQL editor to seed match data.
 *
 * Run this once when setting up the dev project.
 *
 * Usage:
 *   1. Temporarily set .env.local to prod credentials
 *   2. npm run export-matches   → creates scripts/match-data.sql
 *   3. Restore .env.local to dev credentials
 *   4. Paste scripts/match-data.sql into dev Supabase SQL editor and run it
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Bypass the safety check — this script intentionally runs against prod to export
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌  Missing env vars. Point .env.local at your prod project first.')
  process.exit(1)
}

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function escStr(s: unknown) {
  if (s == null) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

async function main() {
  console.log('\n📤  Exporting match data from production…\n')

  const { data: teams, error: teamErr } = await client
    .from('teams')
    .select('*')
    .order('id')

  const { data: matches, error: matchErr } = await client
    .from('matches')
    .select('*')
    .order('match_number')

  if (teamErr || matchErr) {
    console.error('❌  Error:', teamErr?.message || matchErr?.message)
    process.exit(1)
  }

  console.log(`  ✓  ${teams?.length ?? 0} teams`)
  console.log(`  ✓  ${matches?.length ?? 0} matches`)

  let sql = `-- Phase23 WCP — match data export\n-- Paste into dev Supabase SQL editor\n\n`

  // Teams
  sql += `-- ── Teams ────────────────────────────────────────────\n`
  sql += `TRUNCATE teams CASCADE;\n`
  for (const t of teams ?? []) {
    sql += `INSERT INTO teams (id, name, group_letter, group_position, flag_code) VALUES (${t.id}, ${escStr(t.name)}, ${escStr(t.group_letter)}, ${t.group_position}, ${escStr(t.flag_code)});\n`
  }

  // Matches
  sql += `\n-- ── Matches ──────────────────────────────────────────\n`
  sql += `TRUNCATE matches;\n`
  for (const m of matches ?? []) {
    sql += `INSERT INTO matches (id, match_number, stage, home_label, away_label, home_team_id, away_team_id, kickoff_at, venue, home_score, away_score, extra_time, penalties, penalty_home, penalty_away, status) VALUES (`
    sql += [
      m.id,
      m.match_number,
      escStr(m.stage),
      escStr(m.home_label),
      escStr(m.away_label),
      m.home_team_id ?? 'NULL',
      m.away_team_id ?? 'NULL',
      escStr(m.kickoff_at),
      escStr(m.venue),
      m.home_score ?? 'NULL',
      m.away_score ?? 'NULL',
      m.extra_time ? 'TRUE' : 'FALSE',
      m.penalties ? 'TRUE' : 'FALSE',
      m.penalty_home ?? 'NULL',
      m.penalty_away ?? 'NULL',
      escStr(m.status),
    ].join(', ')
    sql += `);\n`
  }

  const outPath = path.resolve(process.cwd(), 'scripts/match-data.sql')
  fs.writeFileSync(outPath, sql, 'utf-8')

  console.log(`\n✅  Exported to scripts/match-data.sql`)
  console.log(`\nNext steps:`)
  console.log(`  1. Restore .env.local to your DEV project credentials`)
  console.log(`  2. Open Supabase dev dashboard → SQL Editor`)
  console.log(`  3. Paste the contents of scripts/match-data.sql and run it\n`)
}

main().catch(err => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
