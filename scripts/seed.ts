/**
 * npm run seed
 *
 * Creates 10 test users, a test competition, and generates varied picks
 * for every group stage match (and tournament winner predictions).
 * Safe to run repeatedly — skips users/competition that already exist.
 *
 * Prerequisites:
 *   - .env.local points at the DEV Supabase project (not production)
 *   - SUPABASE_SERVICE_ROLE_KEY is set in .env.local
 *   - Teams + matches are already seeded in the dev DB (run export-matches first)
 */

import { adminClient } from './_client.js'

// ─────────────────────────────────────────────────────────────────────────────
// Test user definitions
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PASSWORD = 'TestUser1234!'
const COMPETITION_NAME = '🧪 TEST — Sherwood Cup 2026'
const COMPETITION_CODE = 'TEST01'

type Strategy =
  | 'smart'       // ~70% correct results, tight realistic scores
  | 'analyst'     // ~60% correct results, often off on exact score
  | 'favorites'   // always picks the stronger team by 2 goals
  | 'underdogs'   // always picks the weaker team by 1 goal
  | 'low_scoring' // everything is 1-0 or 0-0
  | 'high_scoring'// everything is 3-2 or 4-3
  | 'all_draws'   // every match is 1-1
  | 'all_zeros'   // every match is 0-0
  | 'random'      // pure random
  | 'chaos'       // extreme random, 0–6 each side

const TEST_USERS: { email: string; team_name: string; strategy: Strategy }[] = [
  { email: 'test-01@phase23dev.com', team_name: 'Tactical Terriers',      strategy: 'smart'       },
  { email: 'test-02@phase23dev.com', team_name: 'The Analyst',            strategy: 'analyst'     },
  { email: 'test-03@phase23dev.com', team_name: 'Captain Obvious FC',     strategy: 'favorites'   },
  { email: 'test-04@phase23dev.com', team_name: 'The Underdog Club',      strategy: 'underdogs'   },
  { email: 'test-05@phase23dev.com', team_name: 'Low Block United',       strategy: 'low_scoring' },
  { email: 'test-06@phase23dev.com', team_name: 'Attack Attack Attack',   strategy: 'high_scoring'},
  { email: 'test-07@phase23dev.com', team_name: 'Draw Merchants',         strategy: 'all_draws'   },
  { email: 'test-08@phase23dev.com', team_name: 'Last Minute Larry',      strategy: 'all_zeros'   },
  { email: 'test-09@phase23dev.com', team_name: 'Coin Flip FC',           strategy: 'random'      },
  { email: 'test-10@phase23dev.com', team_name: 'Chaos Theory United',    strategy: 'chaos'       },
]

// Which team each user predicts will win the tournament (spread across contenders)
const TOURNAMENT_PICKS = [
  'Brazil', 'France', 'England', 'Argentina', 'Germany',
  'Brazil', 'France', 'Spain',   'Argentina', 'Portugal',
]

// ─────────────────────────────────────────────────────────────────────────────
// Pick generation strategies
// ─────────────────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generatePick(
  strategy: Strategy,
  _matchIndex: number,
): { home: number; away: number } {
  switch (strategy) {
    case 'smart':
      // Mostly home-team wins (slight home bias in football), realistic scores
      return Math.random() < 0.45
        ? { home: rand(1, 3), away: rand(0, 1) }
        : Math.random() < 0.3
        ? { home: rand(0, 1), away: rand(1, 3) }
        : { home: 1, away: 1 }

    case 'analyst':
      // Correct tendencies but fewer exact scores
      return Math.random() < 0.4
        ? { home: rand(1, 2), away: 0 }
        : Math.random() < 0.3
        ? { home: 0, away: rand(1, 2) }
        : { home: 1, away: 1 }

    case 'favorites':
      return { home: rand(2, 3), away: rand(0, 1) }

    case 'underdogs':
      return { home: rand(0, 1), away: rand(1, 2) }

    case 'low_scoring':
      return Math.random() < 0.6 ? { home: 1, away: 0 } : { home: 0, away: 0 }

    case 'high_scoring':
      return Math.random() < 0.5
        ? { home: 3, away: 2 }
        : { home: 4, away: 3 }

    case 'all_draws':
      return { home: 1, away: 1 }

    case 'all_zeros':
      return { home: 0, away: 0 }

    case 'random':
      return { home: rand(0, 3), away: rand(0, 3) }

    case 'chaos':
      return { home: rand(0, 6), away: rand(0, 6) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Phase23 Test Data Seeder')
  console.log('────────────────────────────────────────\n')

  // 1. Fetch matches ──────────────────────────────────────────────────────────
  const { data: matches, error: matchErr } = await adminClient
    .from('matches')
    .select('id, stage, match_number')
    .order('match_number')

  if (matchErr || !matches?.length) {
    console.error('❌  No matches found. Run `npm run export-matches` first to seed match data.')
    process.exit(1)
  }
  console.log(`✓  Found ${matches.length} matches`)

  // 2. Fetch teams for tournament winner picks ────────────────────────────────
  const { data: teams } = await adminClient
    .from('teams')
    .select('id, name')

  const teamsByName = new Map((teams ?? []).map(t => [t.name.toLowerCase(), t.id]))

  // 3. Create / retrieve competition ─────────────────────────────────────────
  let { data: comp } = await adminClient
    .from('competitions')
    .select('id')
    .eq('join_code', COMPETITION_CODE)
    .maybeSingle()

  if (!comp) {
    // We need an admin user — use the first test user we'll create
    const placeholderAdminId = '00000000-0000-0000-0000-000000000001'
    const { data: newComp, error: compErr } = await adminClient
      .from('competitions')
      .insert({ name: COMPETITION_NAME, join_code: COMPETITION_CODE, admin_id: placeholderAdminId })
      .select('id')
      .single()

    if (compErr) {
      console.error('❌  Failed to create competition:', compErr.message)
      process.exit(1)
    }
    comp = newComp
    console.log(`✓  Created competition "${COMPETITION_NAME}"`)
  } else {
    console.log(`✓  Competition already exists, reusing`)
  }

  const competitionId = comp.id

  // 4. Create users + picks ──────────────────────────────────────────────────
  const createdUsers: { id: string; email: string; strategy: Strategy; tournamentTeamName: string }[] = []

  for (let i = 0; i < TEST_USERS.length; i++) {
    const u = TEST_USERS[i]
    process.stdout.write(`  Creating ${u.team_name}… `)

    // Create auth user (idempotent — get existing if already created)
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { team_name: u.team_name },
    })

    let userId: string
    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        // Look up existing user
        const { data: existing } = await adminClient.auth.admin.listUsers()
        const found = existing?.users.find(x => x.email === u.email)
        if (!found) {
          console.log(`❌  Could not find existing user: ${authErr.message}`)
          continue
        }
        userId = found.id
        process.stdout.write('(existing) ')
      } else {
        console.log(`❌  ${authErr.message}`)
        continue
      }
    } else {
      userId = authData.user.id
    }

    // Ensure profile exists
    await adminClient.from('profiles').upsert({
      id: userId,
      email: u.email,
      team_name: u.team_name,
      icon_key: 'ball-classic',
    }, { onConflict: 'id' })

    // Update competition admin to first user if placeholder was used
    if (i === 0) {
      await adminClient
        .from('competitions')
        .update({ admin_id: userId })
        .eq('id', competitionId)
        .eq('admin_id', '00000000-0000-0000-0000-000000000001')
    }

    // Join competition
    await adminClient.from('competition_members').upsert(
      { competition_id: competitionId, user_id: userId },
      { onConflict: 'competition_id,user_id' }
    )

    // Generate picks for all group stage matches
    const groupMatches = matches.filter(m => m.stage === 'group')
    const pickRows = groupMatches.map((m, idx) => {
      const { home, away } = generatePick(u.strategy, idx)
      return {
        user_id: userId,
        competition_id: competitionId,
        match_id: m.id,
        home_score_pick: home,
        away_score_pick: away,
        advancing_team_id: null,
        updated_at: new Date().toISOString(),
      }
    })

    if (pickRows.length > 0) {
      const { error: pickErr } = await adminClient
        .from('picks')
        .upsert(pickRows, { onConflict: 'user_id,competition_id,match_id' })
      if (pickErr) {
        console.log(`⚠️  Pick error: ${pickErr.message}`)
      }
    }

    // Also mark group stage as submitted
    await adminClient.from('stage_submissions').upsert(
      { competition_id: competitionId, user_id: userId, stage: 'group' },
      { onConflict: 'competition_id,user_id,stage' }
    )

    // Tournament winner prediction
    const tournamentTeamName = TOURNAMENT_PICKS[i]
    const tournamentTeamId = teamsByName.get(tournamentTeamName.toLowerCase())
    if (tournamentTeamId) {
      await adminClient.from('tournament_predictions').upsert(
        { competition_id: competitionId, user_id: userId, team_id: tournamentTeamId },
        { onConflict: 'competition_id,user_id' }
      )
    }

    createdUsers.push({ id: userId, email: u.email, strategy: u.strategy, tournamentTeamName })
    console.log(`✓`)
  }

  // 5. Summary ────────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────')
  console.log('✅  Seeding complete!\n')
  console.log(`Competition: "${COMPETITION_NAME}"`)
  console.log(`Join code:   ${COMPETITION_CODE}`)
  console.log(`Password for all test users: ${TEST_PASSWORD}`)
  console.log('\nUsers created:')
  createdUsers.forEach(u => {
    console.log(`  ${u.email.padEnd(32)} strategy=${u.strategy.padEnd(12)} tournament_pick=${u.tournamentTeamName}`)
  })
  console.log('\nNext step: npm run simulate group\n')
}

main().catch(err => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
