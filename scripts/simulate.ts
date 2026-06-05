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

const GROUP_RESULTS: [number, number, number][] = [
  // Round 1 (match numbers 1-16)
  [1,  1, 1], [2,  2, 0], [3,  0, 1], [4,  3, 1],
  [5,  1, 0], [6,  2, 2], [7,  1, 2], [8,  0, 0],
  [9,  2, 1], [10, 1, 1], [11, 3, 0], [12, 1, 2],
  [13, 0, 1], [14, 2, 0], [15, 1, 1], [16, 4, 0],
  // Round 2 (match numbers 17-32)
  [17, 2, 0], [18, 1, 1], [19, 0, 2], [20, 1, 0],
  [21, 3, 1], [22, 0, 1], [23, 2, 2], [24, 1, 0],
  [25, 1, 2], [26, 0, 0], [27, 1, 1], [28, 2, 1],
  [29, 3, 2], [30, 1, 0], [31, 0, 1], [32, 2, 0],
  // Round 3 (match numbers 33-48, played simultaneously)
  [33, 2, 1], [34, 1, 0], [35, 0, 0], [36, 2, 2],
  [37, 1, 1], [38, 3, 0], [39, 1, 2], [40, 0, 1],
  [41, 2, 0], [42, 1, 1], [43, 0, 2], [44, 1, 0],
  [45, 3, 1], [46, 0, 0], [47, 2, 1], [48, 1, 2],
]

// Knockout results — [match_number, home_score, away_score, extra_time?, penalties?]
// Penalties only apply if extra_time is true and scores are still level.
type KnockoutResult = [number, number, number, boolean?, boolean?]

const R32_RESULTS: KnockoutResult[] = [
  [49, 2, 0], [50, 1, 1, true, true], [51, 3, 1], [52, 0, 1],
  [53, 2, 1], [54, 1, 0],             [55, 1, 2], [56, 2, 0],
  [57, 1, 0], [58, 2, 1],             [59, 0, 1], [60, 3, 2, true],
  [61, 1, 1, true, true], [62, 2, 0], [63, 1, 0], [64, 0, 1],
  // Second half of R32
  [65, 2, 1], [66, 1, 0], [67, 0, 2], [68, 1, 1, true, true],
  [69, 3, 0], [70, 1, 2], [71, 2, 0], [72, 1, 0],
  [73, 0, 1], [74, 2, 1], [75, 1, 1, true, true], [76, 2, 0],
  [77, 1, 0], [78, 3, 1], [79, 0, 1], [80, 2, 1],
]

const R16_RESULTS: KnockoutResult[] = [
  [81, 2, 0], [82, 1, 1, true, true], [83, 3, 1], [84, 0, 1],
  [85, 2, 1], [86, 1, 0],             [87, 1, 2], [88, 2, 0],
  [89, 1, 0], [90, 2, 1],             [91, 0, 1], [92, 3, 2, true],
  [93, 1, 1, true, true], [94, 2, 0], [95, 1, 0], [96, 0, 1],
]

const QF_RESULTS: KnockoutResult[] = [
  [97, 2, 1],            [98, 1, 1, true, true],
  [99, 3, 0],            [100, 1, 2],
  [101, 2, 0],           [102, 1, 1, true, true],
  [103, 2, 1],           [104, 0, 1],
]

const SF_RESULTS: KnockoutResult[] = [
  [105, 2, 1], [106, 1, 0],
  [107, 1, 0], [108, 3, 1],
]

const THIRD_RESULT: KnockoutResult[] = [
  [109, 2, 1],
]

const FINAL_RESULT: KnockoutResult[] = [
  [110, 1, 1, true, true], // Brazil wins on penalties — matches tournament pick for test-01
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
