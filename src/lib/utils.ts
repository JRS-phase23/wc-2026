import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import type { Match, Team, GroupStanding, GroupData } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKickoff(date: string): string {
  return format(new Date(date), 'EEE, MMM d · h:mm a')
}

export function formatCountdown(date: string): string {
  if (isPast(new Date(date))) return 'Locked'
  return `Locks ${formatDistanceToNow(new Date(date), { addSuffix: true })}`
}

export function isLocked(kickoffAt: string): boolean {
  return isPast(new Date(kickoffAt))
}

export function getStageFirstKickoff(matches: { kickoff_at: string; stage: string }[], stage: string): string | null {
  const stagematches = matches.filter(m => m.stage === stage)
  if (!stagematches.length) return null
  return stagematches.reduce((min, m) =>
    m.kickoff_at < min ? m.kickoff_at : min, stagematches[0].kickoff_at
  )
}

export function isStageLocked(matches: { kickoff_at: string; stage: string }[], stage: string): boolean {
  const firstKickoff = getStageFirstKickoff(matches, stage)
  if (!firstKickoff) return false
  return isPast(new Date(firstKickoff))
}

export function getFlagUrl(code: string | null): string {
  if (!code) return ''
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getResultLabel(home: number, away: number): string {
  if (home > away) return 'W'
  if (home < away) return 'L'
  return 'D'
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Build group standings tables from completed match results */
export function buildGroupStandings(matches: Match[]): GroupData[] {
  const groupMatches = matches.filter(m => m.stage === 'group')
  const letters = [...new Set(
    groupMatches.map(m => m.home_team?.group_letter ?? '?')
  )].sort()

  return letters.map(letter => {
    const gMatches = groupMatches.filter(m => m.home_team?.group_letter === letter)

    // Collect all unique teams in this group
    const teamMap = new Map<number, Team>()
    for (const m of gMatches) {
      if (m.home_team) teamMap.set(m.home_team.id, m.home_team)
      if (m.away_team) teamMap.set(m.away_team.id, m.away_team)
    }

    const standings: GroupStanding[] = Array.from(teamMap.values()).map(team => {
      const teamMatches = gMatches.filter(
        m => (m.home_team_id === team.id || m.away_team_id === team.id) && m.status === 'completed'
      )
      let w = 0, d = 0, l = 0, gf = 0, ga = 0
      for (const m of teamMatches) {
        if (m.home_score == null || m.away_score == null) continue
        const isHome = m.home_team_id === team.id
        const scored = isHome ? m.home_score : m.away_score
        const conceded = isHome ? m.away_score : m.home_score
        gf += scored; ga += conceded
        if (scored > conceded) w++
        else if (scored === conceded) d++
        else l++
      }
      return {
        team,
        played: w + d + l,
        won: w, drawn: d, lost: l,
        goals_for: gf, goals_against: ga,
        goal_diff: gf - ga,
        points: w * 3 + d,
      }
    }).sort((a, b) =>
      b.points - a.points ||
      b.goal_diff - a.goal_diff ||
      b.goals_for - a.goals_for ||
      a.team.name.localeCompare(b.team.name)
    )

    const completedGroupMatches = gMatches.filter(m => m.status === 'completed')
    return { letter, standings, matches: completedGroupMatches }
  })
}
