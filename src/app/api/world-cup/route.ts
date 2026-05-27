import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGroupStandings } from '@/lib/utils'
import type { Match } from '@/types'

// Cache for 5 minutes
export const revalidate = 300

export async function GET() {
  const apiKey = process.env.RAPIDAPI_KEY

  // If API key available, try live feed first
  if (apiKey) {
    try {
      const res = await fetch(
        'https://api-football-v1.p.rapidapi.com/v3/standings?league=1&season=2026',
        {
          headers: {
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
            'x-rapidapi-key': apiKey,
          },
          next: { revalidate: 300 },
        }
      )
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ source: 'live', data: data.response })
      }
    } catch {
      // fall through to DB data
    }
  }

  // Fall back to DB-calculated standings
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code,group_letter,group_position), away_team:teams!matches_away_team_id_fkey(id,name,flag_code,group_letter,group_position)')
    .order('match_number')

  const groupStandings = buildGroupStandings((matches ?? []) as Match[])
  return NextResponse.json({ source: 'db', data: groupStandings })
}
