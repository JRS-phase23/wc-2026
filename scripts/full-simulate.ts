/**
 * npm run full-simulate
 *
 * Full end-to-end World Cup simulation with complete data integrity:
 *   1. Resets all match results to scheduled
 *   2. Simulates each stage's match results
 *   3. Calculates standings / resolves which teams advance
 *   4. Updates home_team_id / away_team_id on next-stage matches
 *   5. Generates picks for all 10 test users across every stage
 *   6. Marks each stage as submitted for all users
 *
 * Run after `npm run seed` to get a fully populated tournament.
 */

import { adminClient } from './_client.js'

const COMPETITION_CODE = 'TEST01'
const TEST_EMAIL_DOMAIN = '@phase23dev.com'

// ─── Match results by match_number ────────────────────────────────────────────

const SCORES: Record<number, { h: number; a: number; et?: true; pso?: true }> = {
  // Group Stage (72 matches, 1–72)
  1:  { h:1, a:1 }, 2:  { h:2, a:0 }, 3:  { h:0, a:1 }, 4:  { h:3, a:1 },
  5:  { h:1, a:0 }, 6:  { h:2, a:2 }, 7:  { h:1, a:2 }, 8:  { h:0, a:0 },
  9:  { h:2, a:1 }, 10: { h:1, a:1 }, 11: { h:3, a:0 }, 12: { h:1, a:2 },
  13: { h:0, a:1 }, 14: { h:2, a:0 }, 15: { h:1, a:1 }, 16: { h:4, a:0 },
  17: { h:1, a:0 }, 18: { h:0, a:2 }, 19: { h:2, a:1 }, 20: { h:1, a:1 },
  21: { h:3, a:0 }, 22: { h:0, a:1 }, 23: { h:2, a:2 }, 24: { h:1, a:0 },
  25: { h:2, a:0 }, 26: { h:1, a:1 }, 27: { h:0, a:2 }, 28: { h:1, a:0 },
  29: { h:3, a:1 }, 30: { h:0, a:1 }, 31: { h:2, a:2 }, 32: { h:1, a:0 },
  33: { h:1, a:2 }, 34: { h:0, a:0 }, 35: { h:1, a:1 }, 36: { h:2, a:1 },
  37: { h:3, a:2 }, 38: { h:1, a:0 }, 39: { h:0, a:1 }, 40: { h:2, a:0 },
  41: { h:1, a:0 }, 42: { h:0, a:2 }, 43: { h:2, a:1 }, 44: { h:1, a:1 },
  45: { h:3, a:0 }, 46: { h:0, a:1 }, 47: { h:2, a:2 }, 48: { h:1, a:0 },
  49: { h:2, a:1 }, 50: { h:1, a:0 }, 51: { h:0, a:0 }, 52: { h:2, a:2 },
  53: { h:1, a:1 }, 54: { h:3, a:0 }, 55: { h:1, a:2 }, 56: { h:0, a:1 },
  57: { h:2, a:0 }, 58: { h:1, a:1 }, 59: { h:0, a:2 }, 60: { h:1, a:0 },
  61: { h:3, a:1 }, 62: { h:0, a:0 }, 63: { h:2, a:1 }, 64: { h:1, a:2 },
  65: { h:1, a:0 }, 66: { h:0, a:2 }, 67: { h:2, a:1 }, 68: { h:1, a:1 },
  69: { h:3, a:0 }, 70: { h:0, a:1 }, 71: { h:2, a:2 }, 72: { h:1, a:0 },
  // Round of 32 (16 matches, 73–88)
  73: { h:2, a:0 }, 74: { h:1, a:1, et:true, pso:true },
  75: { h:3, a:1 }, 76: { h:0, a:1 },
  77: { h:2, a:1 }, 78: { h:1, a:0 },
  79: { h:1, a:2 }, 80: { h:2, a:0 },
  81: { h:1, a:0 }, 82: { h:2, a:1 },
  83: { h:0, a:1 }, 84: { h:3, a:2, et:true },
  85: { h:1, a:1, et:true, pso:true }, 86: { h:2, a:0 },
  87: { h:1, a:0 }, 88: { h:0, a:1 },
  // Round of 16 (8 matches, 89–96)
  89: { h:2, a:0 }, 90: { h:1, a:1, et:true, pso:true },
  91: { h:3, a:1 }, 92: { h:0, a:1 },
  93: { h:2, a:1 }, 94: { h:1, a:0 },
  95: { h:1, a:2 }, 96: { h:2, a:0 },
  // Quarter-Finals (4 matches, 97–100)
  97: { h:2, a:1 }, 98: { h:1, a:1, et:true, pso:true },
  99: { h:3, a:0 }, 100: { h:0, a:1 },
  // Semi-Finals (2 matches, 101–102)
  101: { h:2, a:1 }, 102: { h:1, a:0 },
  // 3rd Place + Final
  103: { h:2, a:1 },                        // 3rd place
  104: { h:1, a:1, et:true, pso:true },      // Final — home wins PSO → tournament winner
}

// ─── Pick strategies ──────────────────────────────────────────────────────────

type Strategy = 'smart'|'analyst'|'favorites'|'underdogs'|'low_scoring'|
                'high_scoring'|'all_draws'|'all_zeros'|'random'|'chaos'

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickScore(strategy: Strategy): { h: number; a: number } {
  switch (strategy) {
    case 'smart':       return Math.random()<.45?{h:rand(1,3),a:rand(0,1)}:Math.random()<.35?{h:rand(0,1),a:rand(1,3)}:{h:1,a:1}
    case 'analyst':     return Math.random()<.4?{h:rand(1,2),a:0}:Math.random()<.3?{h:0,a:rand(1,2)}:{h:1,a:1}
    case 'favorites':   return {h:rand(2,3),a:rand(0,1)}
    case 'underdogs':   return {h:rand(0,1),a:rand(1,2)}
    case 'low_scoring': return Math.random()<.6?{h:1,a:0}:{h:0,a:0}
    case 'high_scoring':return Math.random()<.5?{h:3,a:2}:{h:4,a:3}
    case 'all_draws':   return {h:1,a:1}
    case 'all_zeros':   return {h:0,a:0}
    case 'random':      return {h:rand(0,3),a:rand(0,3)}
    case 'chaos':       return {h:rand(0,6),a:rand(0,6)}
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

type MatchRow = {
  id: number; match_number: number; stage: string
  home_label: string; away_label: string
  home_team_id: number|null; away_team_id: number|null
  home_score: number|null; away_score: number|null
  status: string; extra_time: boolean; penalties: boolean
  penalty_home: number|null; penalty_away: number|null
}

function getWinner(m: MatchRow): number|null {
  if (m.status !== 'completed') return null
  if (m.penalties) return m.penalty_home! > m.penalty_away! ? m.home_team_id : m.away_team_id
  if (m.home_score! > m.away_score!) return m.home_team_id
  if (m.away_score! > m.home_score!) return m.away_team_id
  return m.home_team_id // fallback (shouldn't happen in knockout unless ET)
}

function getLoser(m: MatchRow): number|null {
  const w = getWinner(m)
  if (!w) return null
  return w === m.home_team_id ? m.away_team_id : m.home_team_id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏆  Phase23 Full Tournament Simulator')
  console.log('════════════════════════════════════════\n')

  // Fetch competition
  const { data: comp } = await adminClient.from('competitions')
    .select('id').eq('join_code', COMPETITION_CODE).maybeSingle()
  if (!comp) { console.error('❌  Run `npm run seed` first'); process.exit(1) }
  const competitionId = comp.id

  // Fetch members + strategies
  const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const testUsers = users.users.filter(u => u.email?.endsWith(TEST_EMAIL_DOMAIN))
  if (!testUsers.length) { console.error('❌  No test users found. Run `npm run seed` first.'); process.exit(1) }

  const strategies: Strategy[] = [
    'smart','analyst','favorites','underdogs','low_scoring',
    'high_scoring','all_draws','all_zeros','random','chaos'
  ]
  const userStrategy = (userId: string): Strategy => {
    const idx = testUsers.findIndex(u => u.id === userId)
    return strategies[idx % strategies.length]
  }

  // Fetch all matches
  const { data: allMatchData } = await adminClient.from('matches')
    .select('*').order('match_number')
  const allMatches = allMatchData as MatchRow[]
  const matchByNum = new Map(allMatches.map(m => [m.match_number, m]))

  // ── Step 0: Reset all matches to scheduled ──────────────────────────────────
  console.log('🔄  Resetting all match results…')
  await adminClient.from('matches').update({
    status: 'scheduled', home_score: null, away_score: null,
    extra_time: false, penalties: false, penalty_home: null, penalty_away: null,
    home_team_id: null, away_team_id: null,
  }).neq('stage', 'group') // keep group team assignments (they're pre-set)
  await adminClient.from('matches').update({
    status: 'scheduled', home_score: null, away_score: null,
    extra_time: false, penalties: false, penalty_home: null, penalty_away: null,
  }).eq('stage', 'group')

  // Re-fetch after reset
  const { data: freshData } = await adminClient.from('matches').select('*').order('match_number')
  const fresh = freshData as MatchRow[]
  const byNum = new Map(fresh.map(m => [m.match_number, m]))

  // Also clear existing picks and submissions for all stages beyond group
  await adminClient.from('picks')
    .delete()
    .eq('competition_id', competitionId)
    .in('match_id', fresh.filter(m => m.stage !== 'group').map(m => m.id))

  await adminClient.from('stage_submissions')
    .delete()
    .eq('competition_id', competitionId)
    .neq('stage', 'group') // keep group submissions

  console.log('✓  Reset complete\n')

  // ── Helper: apply scores to a set of matches ─────────────────────────────────
  async function applyScores(matchNums: number[]) {
    for (const num of matchNums) {
      const s = SCORES[num]
      if (!s) continue
      const psoHome = s.pso ? 5 : null
      const psoAway = s.pso ? 4 : null // home always wins PSO in test data
      await adminClient.from('matches').update({
        home_score: s.h, away_score: s.a,
        extra_time: s.et ?? false, penalties: s.pso ?? false,
        penalty_home: psoHome, penalty_away: psoAway,
        status: 'completed',
      }).eq('match_number', num)
    }
  }

  // ── Helper: generate + save picks for a stage ────────────────────────────────
  async function generatePicks(stageKey: string, matchNums: number[]) {
    // Re-fetch these matches to get current team IDs
    const { data: stageMatchData } = await adminClient.from('matches')
      .select('*').in('match_number', matchNums)
    const stageMatches = stageMatchData as MatchRow[]

    for (const user of testUsers) {
      const strategy = userStrategy(user.id)
      const rows = stageMatches.map(m => {
        const { h, a } = pickScore(strategy)
        // For knockout draws, randomly pick an advancing team
        let advancing: number|null = null
        if (m.stage !== 'group' && h === a && m.home_team_id && m.away_team_id) {
          advancing = Math.random() < 0.5 ? m.home_team_id : m.away_team_id
        }
        return {
          user_id: user.id,
          competition_id: competitionId,
          match_id: m.id,
          home_score_pick: h,
          away_score_pick: a,
          advancing_team_id: advancing,
          updated_at: new Date().toISOString(),
        }
      })
      if (rows.length) {
        await adminClient.from('picks').upsert(rows, { onConflict: 'user_id,competition_id,match_id' })
      }
      await adminClient.from('stage_submissions').upsert(
        { competition_id: competitionId, user_id: user.id, stage: stageKey },
        { onConflict: 'competition_id,user_id,stage' }
      )
    }
  }

  // ── Step 1: Group Stage ───────────────────────────────────────────────────────
  console.log('⚽  Simulating Group Stage (72 matches)…')
  const groupNums = Array.from({length:72},(_,i)=>i+1)
  await applyScores(groupNums)
  console.log('   ✓  Results set')

  // Calculate group standings
  const { data: groupMatchData } = await adminClient.from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,group_letter,group_position), away_team:teams!matches_away_team_id_fkey(id,name,group_letter,group_position)')
    .eq('stage', 'group')
  type TeamRow = { id:number; name:string; group_letter:string; group_position:number }
  type GroupMatch = { home_score:number; away_score:number; home_team:TeamRow; away_team:TeamRow }
  const groupMatches = groupMatchData as GroupMatch[]

  // Build standings: group → team → stats
  const standingsMap = new Map<string, Map<number, {
    team: TeamRow; pts:number; gd:number; gf:number; played:number
  }>>()

  for (const m of groupMatches) {
    if (!m.home_team || !m.away_team) continue
    for (const [team, isHome] of [[m.home_team,true],[m.away_team,false]] as [TeamRow,boolean][]) {
      const g = team.group_letter
      if (!standingsMap.has(g)) standingsMap.set(g, new Map())
      const gs = standingsMap.get(g)!
      if (!gs.has(team.id)) gs.set(team.id, {team, pts:0, gd:0, gf:0, played:0})
      const entry = gs.get(team.id)!
      const gf = isHome ? m.home_score : m.away_score
      const ga = isHome ? m.away_score : m.home_score
      const win = gf > ga; const draw = gf === ga
      entry.pts += win ? 3 : draw ? 1 : 0
      entry.gd  += gf - ga
      entry.gf  += gf
      entry.played++
    }
  }

  // Sort each group
  const sortedGroups = new Map<string, Standing[]>()
  for (const [letter, teams] of standingsMap) {
    const sorted = [...teams.values()].sort((a,b) =>
      b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.team.name.localeCompare(b.team.name)
    )
    sortedGroups.set(letter, sorted)
  }

  // Extract finishers
  const first  = new Map<string,number>() // group → team_id
  const second = new Map<string,number>()
  type Standing = { team: TeamRow; pts:number; gd:number; gf:number; played:number }
  const thirds: Array<{letter:string; entry: Standing}> = []

  for (const [letter, sorted] of sortedGroups) {
    if (sorted[0]) first.set(letter, sorted[0].team.id)
    if (sorted[1]) second.set(letter, sorted[1].team.id)
    if (sorted[2]) thirds.push({letter, entry: sorted[2] as any})
  }

  // Best 8 third-place teams
  const best8thirds = thirds
    .sort((a,b) => {
      const ae = a.entry, be = b.entry
      return (be.pts-ae.pts) || (be.gd-ae.gd) || (be.gf-ae.gf)
    })
    .slice(0, 8)
    .map(t => t.entry.team.id)

  console.log('   ✓  Group standings calculated')

  // Resolve team label → team ID
  let thirdIdx = 0
  function resolveLabel(label: string): number|null {
    if (/^\d+[A-Z]$/.test(label)) {
      // e.g. "1A", "2B"
      const pos = parseInt(label[0])
      const grp = label.slice(1)
      if (pos === 1) return first.get(grp) ?? null
      if (pos === 2) return second.get(grp) ?? null
    }
    if (label.startsWith('3-')) {
      // best 3rd — assign in order
      return best8thirds[thirdIdx++] ?? null
    }
    return null
  }

  // Assign R32 teams
  const r32Nums = Array.from({length:16},(_,i)=>73+i)
  const { data: r32Data } = await adminClient.from('matches')
    .select('id,match_number,home_label,away_label').in('match_number', r32Nums)

  for (const m of r32Data ?? []) {
    const homeId = resolveLabel(m.home_label)
    const awayId = resolveLabel(m.away_label)
    if (homeId && awayId) {
      await adminClient.from('matches').update({ home_team_id: homeId, away_team_id: awayId }).eq('id', m.id)
    }
  }
  console.log('   ✓  R32 teams assigned\n')

  // ── Step 2: Round of 32 ───────────────────────────────────────────────────────
  console.log('⚽  Simulating Round of 32 (16 matches)…')
  await generatePicks('r32', r32Nums)
  await applyScores(r32Nums)

  // Re-fetch R32 results to find winners
  const { data: r32Results } = await adminClient.from('matches')
    .select('*').in('match_number', r32Nums)
  const r32ByNum = new Map((r32Results as MatchRow[]).map(m => [m.match_number, m]))

  // Assign R16 teams (labels like "W74", "W77")
  const r16Nums = Array.from({length:8},(_,i)=>89+i)
  const { data: r16Labels } = await adminClient.from('matches')
    .select('id,home_label,away_label').in('match_number', r16Nums)

  for (const m of r16Labels ?? []) {
    function resolveW(label: string): number|null {
      const num = parseInt(label.replace('W',''))
      const match = r32ByNum.get(num)
      return match ? getWinner(match) : null
    }
    const homeId = resolveW(m.home_label)
    const awayId = resolveW(m.away_label)
    if (homeId && awayId) {
      await adminClient.from('matches').update({ home_team_id: homeId, away_team_id: awayId }).eq('id', m.id)
    }
  }
  console.log('   ✓  Results + R16 teams assigned\n')

  // ── Step 3: Round of 16 ───────────────────────────────────────────────────────
  console.log('⚽  Simulating Round of 16 (8 matches)…')
  await generatePicks('r16', r16Nums)
  await applyScores(r16Nums)

  const { data: r16Results } = await adminClient.from('matches').select('*').in('match_number', r16Nums)
  const r16ByNum = new Map((r16Results as MatchRow[]).map(m => [m.match_number, m]))

  // Assign QF teams
  const qfNums = [97,98,99,100]
  const { data: qfLabels } = await adminClient.from('matches')
    .select('id,home_label,away_label').in('match_number', qfNums)

  for (const m of qfLabels ?? []) {
    const resolve = (label: string) => {
      const num = parseInt(label.replace('W',''))
      const match = r16ByNum.get(num)
      return match ? getWinner(match) : null
    }
    const homeId = resolve(m.home_label)
    const awayId = resolve(m.away_label)
    if (homeId && awayId) {
      await adminClient.from('matches').update({ home_team_id: homeId, away_team_id: awayId }).eq('id', m.id)
    }
  }
  console.log('   ✓  Results + QF teams assigned\n')

  // ── Step 4: Quarter-Finals ────────────────────────────────────────────────────
  console.log('⚽  Simulating Quarter-Finals (4 matches)…')
  await generatePicks('qf', qfNums)
  await applyScores(qfNums)

  const { data: qfResults } = await adminClient.from('matches').select('*').in('match_number', qfNums)
  const qfByNum = new Map((qfResults as MatchRow[]).map(m => [m.match_number, m]))

  // Assign SF teams
  const sfNums = [101,102]
  const { data: sfLabels } = await adminClient.from('matches')
    .select('id,home_label,away_label').in('match_number', sfNums)

  for (const m of sfLabels ?? []) {
    const resolve = (label: string) => {
      const num = parseInt(label.replace('W',''))
      return getWinner(qfByNum.get(num)!)
    }
    const homeId = resolve(m.home_label)
    const awayId = resolve(m.away_label)
    if (homeId && awayId) {
      await adminClient.from('matches').update({ home_team_id: homeId, away_team_id: awayId }).eq('id', m.id)
    }
  }
  console.log('   ✓  Results + SF teams assigned\n')

  // ── Step 5: Semi-Finals ───────────────────────────────────────────────────────
  console.log('⚽  Simulating Semi-Finals (2 matches)…')
  await generatePicks('sf', sfNums)
  await applyScores(sfNums)

  const { data: sfResults } = await adminClient.from('matches').select('*').in('match_number', sfNums)
  const sfByNum = new Map((sfResults as MatchRow[]).map(m => [m.match_number, m]))

  // Assign 3rd place + Final teams (labels: "RU101", "RU102", "W101", "W102")
  for (const [matchNum, resolver] of [[103, getLoser], [104, getWinner]] as [number, typeof getWinner][]) {
    const { data: labels } = await adminClient.from('matches')
      .select('id,home_label,away_label').eq('match_number', matchNum).single()
    if (labels) {
      const resolve = (label: string) => {
        const num = parseInt(label.replace('RU','').replace('W',''))
        const m = sfByNum.get(num)
        return m ? resolver(m) : null
      }
      const homeId = resolve(labels.home_label)
      const awayId = resolve(labels.away_label)
      if (homeId && awayId) {
        await adminClient.from('matches').update({ home_team_id: homeId, away_team_id: awayId }).eq('id', labels.id)
      }
    }
  }
  console.log('   ✓  Results + 3rd/Final teams assigned\n')

  // ── Step 6: 3rd Place + Final ─────────────────────────────────────────────────
  console.log('⚽  Simulating 3rd Place & Final…')
  await generatePicks('3rd', [103])
  await generatePicks('final', [104])
  await applyScores([103, 104])
  console.log('   ✓  Tournament complete!\n')

  // ── Summary ───────────────────────────────────────────────────────────────────
  // Find the tournament winner
  const { data: finalMatch } = await adminClient.from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
    .eq('match_number', 104).single()

  const winner = finalMatch && (finalMatch as any).penalties
    ? ((finalMatch as any).penalty_home > (finalMatch as any).penalty_away
        ? (finalMatch as any).home_team?.name
        : (finalMatch as any).away_team?.name)
    : finalMatch && (finalMatch as any).home_score > (finalMatch as any).away_score
      ? (finalMatch as any).home_team?.name
      : (finalMatch as any).away_team?.name

  console.log('════════════════════════════════════════')
  console.log('✅  Full simulation complete!\n')
  console.log(`🏆  World Cup Winner: ${winner ?? 'Unknown'}`)
  console.log(`\n   All 10 players have picks for all 104 matches`)
  console.log(`   Check the leaderboard — scoring includes:`)
  console.log(`     • Group stage: result + GD + exact score`)
  console.log(`     • Knockout: + advancing team bonus`)
  console.log(`     • Tournament winner: +25 pts for correct prediction\n`)
  console.log(`   Refresh the app to see the full leaderboard.\n`)
}

main().catch(err => { console.error('❌  Unexpected error:', err); process.exit(1) })
