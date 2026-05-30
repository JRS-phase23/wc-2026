import type { Match, Pick, ScoredPick, Stage } from '@/types'

const POINTS = {
  result: 5,
  goal_diff: 5,
  exact: 10,
  approx: 3,
  knockout: 10,
} as const

const MANY_GOALS_THRESHOLD = 4

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function scorePick(pick: Pick, match: Match): ScoredPick {
  const breakdown = { result: 0, goal_diff: 0, exact: 0, approx: 0, knockout: 0 }

  if (match.status !== 'completed' || match.home_score == null || match.away_score == null) {
    return { ...pick, points: 0, breakdown }
  }

  const actualHome = match.home_score
  const actualAway = match.away_score
  const pickHome = pick.home_score_pick
  const pickAway = pick.away_score_pick

  const actualResult = getResult(actualHome, actualAway)
  const pickResult = getResult(pickHome, pickAway)
  const isExact = actualHome === pickHome && actualAway === pickAway

  // Correct result (W/D/L)
  if (actualResult === pickResult) breakdown.result = POINTS.result

  // Correct goal difference (only meaningful if result also correct)
  const actualGD = actualHome - actualAway
  const pickGD = pickHome - pickAway
  if (actualGD === pickGD) breakdown.goal_diff = POINTS.goal_diff

  // Exact scoreline
  if (isExact) breakdown.exact = POINTS.exact

  // Good approximation: only if not exact, total goals ≥ threshold, off by ≤1 on each team
  if (!isExact) {
    const totalActual = actualHome + actualAway
    if (totalActual >= MANY_GOALS_THRESHOLD) {
      const homeOff = Math.abs(actualHome - pickHome)
      const awayOff = Math.abs(actualAway - pickAway)
      if (homeOff <= 1 && awayOff <= 1) {
        breakdown.approx = POINTS.approx
      }
    }
  }

  // Knockout team advancing bonus
  if (match.stage !== 'group') {
    const actualWinner = match.penalties
      ? (match.penalty_home != null && match.penalty_away != null
          ? (match.penalty_home > match.penalty_away ? match.home_team_id : match.away_team_id)
          : null)
      : (actualResult === 'home' ? match.home_team_id : match.away_team_id)

    let predictedWinner: number | null = null
    if (pickResult === 'home') predictedWinner = match.home_team_id
    else if (pickResult === 'away') predictedWinner = match.away_team_id
    else if (pick.advancing_team_id) predictedWinner = pick.advancing_team_id

    if (actualWinner && predictedWinner && actualWinner === predictedWinner) {
      breakdown.knockout = POINTS.knockout
    }
  }

  const points = breakdown.result + breakdown.goal_diff + breakdown.exact + breakdown.approx + breakdown.knockout

  return { ...pick, points, breakdown }
}

export function scoreAllPicks(picks: Pick[], matches: Match[]): ScoredPick[] {
  const matchMap = new Map(matches.map(m => [m.id, m]))
  return picks.map(pick => {
    const match = matchMap.get(pick.match_id)
    if (!match) return { ...pick, points: 0, breakdown: { result: 0, goal_diff: 0, exact: 0, approx: 0, knockout: 0 } }
    return scorePick(pick, match)
  })
}

export function getMaxPossiblePoints(match: Match): number {
  if (match.stage === 'group') {
    return POINTS.result + POINTS.goal_diff + POINTS.exact
  }
  return POINTS.result + POINTS.goal_diff + POINTS.exact + POINTS.knockout
}

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  '3rd': 'Third Place',
  final: 'Final',
}

export const STAGE_ORDER: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

export const TOURNAMENT_WINNER_BONUS = 25
