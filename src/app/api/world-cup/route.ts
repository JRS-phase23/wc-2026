import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGroupStandings } from '@/lib/utils'
import type { Match, Team, GroupData } from '@/types'

export const revalidate = 300

interface FDTableEntry {
  team: { id: number; name: string; shortName: string }
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}
interface FDStanding { type: string; group: string; table: FDTableEntry[] }

export async function GET() {
  const supabase = await createClient()

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code,group_letter,group_position), away_team:teams!matches_away_team_id_fkey(id,name,flag_code,group_letter,group_position)')
      .order('match_number'),
    supabase.from('teams').select('id,name,flag_code'),
  ])

  const allMatches = (matches ?? []) as Match[]
  const allTeams = (teams ?? []) as Pick<Team, 'id' | 'name' | 'flag_code'>[]

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(
        'https://api.football-data.org/v4/competitions/2000/standings',
        {
          headers: { 'X-Auth-Token': apiKey },
          next: { revalidate: 300 },
        }
      )
      if (res.ok) {
        const json = await res.json()
        const byName = new Map(allTeams.map(t => [t.name.toLowerCase(), t]))
        const totalStandings = ((json.standings ?? []) as FDStanding[]).filter(
          s => s.type === 'TOTAL'
        )

        const groupsData: GroupData[] = totalStandings.map(s => {
          const letter = s.group.replace('GROUP_', '')
          const groupMatches = allMatches.filter(
            m => m.status === 'completed' && m.home_team?.group_letter === letter
          )
          return {
            letter,
            standings: s.table.map(row => {
              const dbTeam =
                byName.get(row.team.name.toLowerCase()) ??
                byName.get(row.team.shortName.toLowerCase())
              return {
                team: {
                  id: row.team.id,
                  name: dbTeam?.name ?? row.team.name,
                  flag_code: dbTeam?.flag_code,
                } as Team,
                played: row.playedGames,
                won: row.won,
                drawn: row.draw,
                lost: row.lost,
                goals_for: row.goalsFor,
                goals_against: row.goalsAgainst,
                goal_diff: row.goalDifference,
                points: row.points,
              }
            }),
            matches: groupMatches,
          }
        })

        return NextResponse.json({ source: 'live', data: groupsData })
      }
    } catch {
      // fall through to DB
    }
  }

  const groupStandings = buildGroupStandings(allMatches)
  return NextResponse.json({ source: 'db', data: groupStandings })
}
