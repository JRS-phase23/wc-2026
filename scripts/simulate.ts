/**
 * npm run simulate [stage]
 *
 * Marks all matches for a stage as completed with realistic test scores.
 * Also resolves team assignments for knockout rounds based on group results.
 *
 * Usage:
 *   npm run simulate group    — completes all 96 group stage matches
 *   npm run simulate r32      — completes all 32 Round of 32 matches
 *   npm run simulate r16      — completes all 16 Round of 16 matches
 *   npm run simulate qf       — completes all 8 Quarter-Final matches
 *   npm run simulate sf       — completes all 4 Semi-Final matches
 *   npm run simulate 3rd      — completes the 3rd Place match
 *   npm run simulate final    — completes the Final (triggers tournament bonus)
 *   npm run simulate all      — runs all stages in sequence
 */

import { adminClient } from './_client.js'

const stage = process.argv[2]

if (!stage) {
  console.error('Usage: npm run simulate [group|r32|r16|qf|sf|3rd|final|all]')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Realistic test match results
// These are plausible fictional results — not real WC 2026 predictions.
// Edit to change how the tournament plays out in your test.
// ─────────────────────────────────────────────────────────────────────────────

// Group stage: [match_number, home_score, away_score]
// Groups A–L, 3 rounds of 16 matches each = 48 group matches
// (WC 2026 has 12 groups × 6 matches = 72 group matches + 32 knockout = 104 total)
// Adjust match_numbers to match your actual DB data.

// Match numbers from DB:
// group: 1-72 (72 matches, 3 rounds × 12 simultaneous games)
// r32:   73-88  (16 matches — 32 teams play 16 games)
// r16:   89-96  (8 matches)
// qf:    97-100 (4 matches)
// sf:    101-102 (2 matches)
// 3rd:   103
// final: 104

const GROUP_RESULTS: [number, number, number][] = [
  // Round 1 — matches 1-24 (Groups A-L, game 1 of 3 per group)
  [1,  1, 1], [2,  2, 0], [3,  0, 1], [4,  3, 1],
  [5,  1, 0], [6,  2, 2], [7,  1, 2], [8,  0, 0],
  [9,  2, 1], [10, 1, 1], [11, 3, 0], [12, 1, 2],
  [13, 0, 1], [14, 2, 0], [15, 1, 1], [16, 4, 0],
  [17, 1, 0], [18, 0, 2], [19, 2, 1], [20, 1, 1],
  [21, 3, 0], [22, 0, 1], [23, 2, 2], [24, 1, 0],
  // Round 2 — matches 25-48
  [25, 2, 0], [26, 1, 1], [27, 0, 2], [28, 1, 0],
  [29, 3, 1], [30, 0, 1], [31, 2, 2], [32, 1, 0],
  [33, 1, 2], [34, 0, 0], [35, 1, 1], [36, 2, 1],
  [37, 3, 2], [38, 1, 0], [39, 0, 1], [40, 2, 0],
  [41, 1, 0], [42, 0, 2], [43, 2, 1], [44, 1, 1],
  [45, 3, 0], [46, 0, 1], [47, 2, 2], [48, 1, 0],
  // Round 3 — matches 49-72 (simultaneous within each group)
  [49, 2, 1], [50, 1, 0], [51, 0, 0], [52, 2, 2],
  [53, 1, 1], [54, 3, 0], [55, 1, 2], [56, 0, 1],
  [57, 2, 0], [58, 1, 1], [59, 0, 2], [60, 1, 0],
  [61, 3, 1], [62, 0, 0], [63, 2, 1], [64, 1, 2],
  [65, 1, 0], [66, 0, 2], [67, 2, 1], [68, 1, 1],
  [69, 3, 0], [70, 0, 1], [71, 2, 2], [72, 1, 0],
]

// Knockout results — [match_number, home_score, away_score, extra_time?, penalties?]
type KnockoutResult = [number, number, number, boolean?, boolean?]

const R32_RESULTS: KnockoutResult[] = [
  [73, 2, 0], [74, 1, 1, true, true], [75, 3, 1], [76, 0, 1],
  [77, 2, 1], [78, 1, 0],             [79, 1, 2], [80, 2, 0],
  [81, 1, 0], [82, 2, 1],             [83, 0, 1], [84, 3, 2, true],
  [85, 1, 1, true, true], [86, 2, 0], [87, 1, 0], [88, 0, 1],
]

const R16_RESULTS: KnockoutResult[] = [
  [89, 2, 0], [90, 1, 1, true, true],
  [91, 3, 1], [92, 0, 1],
  [93, 2, 1], [94, 1, 0],
  [95, 1, 2], [96, 2, 0],
]

const QF_RESULTS: KnockoutResult[] = [
  [97, 2, 1], [98, 1, 1, true, true],
  [99, 3, 0], [100, 0, 1],
]

const SF_RESULTS: KnockoutResult[] = [
  [101, 2, 1],
  [102, 1, 0],
]

const THIRD_RESULT: KnockoutResult[] = [
  [103, 2, 1],
]

const FINAL_RESULT: KnockoutResult[] = [
  [104, 1, 1, true, true], // Brazil wins on penalties — matches tournament pick for test-01
]

// ─────────────────────────────────────────────────────────────────────────────
// Apply results to DB
// ─────────────────────────────────────────────────────────────────────────────

async function applyResults(results: [number, number, number, boolean?, boolean?][], stageName: string) {
  console.log(`\n⚽  Simulating ${stageName}…`)

  // Fetch matches for this stage
  const { data: matches, error } = await adminClient
    .from('matches')
    .select('id, match_number, home_team_id, away_team_id')
    .order('match_number')

  if (error || !matches) {
    console.error('❌  Could not fetch matches:', error?.message)
    return
  }

  const matchByNumber = new Map(matches.map(m => [m.match_number, m]))

  let updated = 0
  let skipped = 0

  for (const [matchNum, homeScore, awayScore, extraTime = false, penalties = false] of results) {
    const match = matchByNumber.get(matchNum)
    if (!match) {
      skipped++
      continue
    }

    const updateData: Record<string, unknown> = {
      home_score: homeScore,
      away_score: awayScore,
      extra_time: extraTime,
      penalties,
      status: 'completed',
    }

    // Simulate penalty shootout scores for draws
    if (penalties) {
      // Home team wins penalties in this test
      updateData.penalty_home = 5
      updateData.penalty_away = 4
    }

    const { error: updateErr } = await adminClient
      .from('matches')
      .update(updateData)
      .eq('match_number', matchNum)

    if (updateErr) {
      console.log(`  ⚠️  Match ${matchNum}: ${updateErr.message}`)
    } else {
      updated++
    }
  }

  console.log(`  ✓  ${updated} matches completed${skipped > 0 ? `, ${skipped} not found (check match numbers)` : ''}`)
}

async function main() {
  console.log('\n🏟️   Phase23 Stage Simulator')
  console.log('────────────────────────────────────────')

  const stages = stage === 'all'
    ? ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
    : [stage]

  for (const s of stages) {
    switch (s) {
      case 'group': await applyResults(GROUP_RESULTS, 'Group Stage'); break
      case 'r32':   await applyResults(R32_RESULTS,   'Round of 32'); break
      case 'r16':   await applyResults(R16_RESULTS,   'Round of 16'); break
      case 'qf':    await applyResults(QF_RESULTS,    'Quarter-Finals'); break
      case 'sf':    await applyResults(SF_RESULTS,    'Semi-Finals'); break
      case '3rd':   await applyResults(THIRD_RESULT,  '3rd Place'); break
      case 'final': await applyResults(FINAL_RESULT,  'Final'); break
      default:
        console.error(`❌  Unknown stage: ${s}`)
        console.error('    Valid options: group | r32 | r16 | qf | sf | 3rd | final | all')
        process.exit(1)
    }
  }

  console.log('\n✅  Done! Refresh the app to see updated scores and leaderboard.\n')
}

main().catch(err => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
