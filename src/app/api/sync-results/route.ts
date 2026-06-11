import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Maps football-data.org team IDs → our DB team IDs
const FD_TEAM: Record<number, number> = {
  769: 15,  // Mexico
  774: 60,  // South Africa
  772: 25,  // Rep. of Korea
  798: 41,  // Czech Rep.
  828: 30,  // Canada
  1060: 65, // Bosnia & Herz.
  771: 16,  // USA
  761: 40,  // Paraguay
  8030: 55, // Qatar
  788: 19,  // Switzerland
  764: 6,   // Brazil
  815: 8,   // Morocco
  836: 83,  // Haiti
  8873: 43, // Scotland
  779: 27,  // Australia
  803: 22,  // Turkey
  759: 10,  // Germany
  9460: 82, // Curaçao
  8601: 7,  // Netherlands
  766: 18,  // Japan
  1935: 34, // Ivory Coast
  791: 23,  // Ecuador
  792: 38,  // Sweden
  802: 44,  // Tunisia
  760: 2,   // Spain
  1930: 69, // Cape Verde
  805: 9,   // Belgium
  825: 29,  // Egypt
  801: 61,  // Saudi Arabia
  758: 17,  // Uruguay
  840: 21,  // IR Iran
  783: 85,  // New Zealand
  773: 1,   // France
  804: 14,  // Senegal
  8062: 57, // Iraq
  8872: 31, // Norway
  762: 3,   // Argentina
  778: 28,  // Algeria
  816: 24,  // Austria
  8049: 63, // Jordan
  765: 5,   // Portugal
  1934: 46, // DR Congo
  770: 4,   // England
  799: 11,  // Croatia
  763: 74,  // Ghana
  1836: 33, // Panama
  8070: 50, // Uzbekistan
  818: 13,  // Colombia
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Vercel cron / manual curl with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) {
    return true
  }

  // Admin session via browser button
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('competitions').select('id').eq('admin_id', user.id).limit(1)
  return (data?.length ?? 0) > 0
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY not set' }, { status: 500 })
  }

  // Fetch all competition matches from football-data.org
  const res = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) {
    return NextResponse.json({ error: `API error ${res.status}` }, { status: 502 })
  }

  const { matches: apiMatches = [] } = await res.json()

  // Load our matches (with their fd_match_id cache and team IDs)
  const db = createServiceClient()
  const { data: dbMatches, error: dbErr } = await db
    .from('matches')
    .select('id, fd_match_id, home_team_id, away_team_id, status')
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Build lookup maps
  const byFdId = new Map<number, typeof dbMatches[0]>()
  const byTeamPair = new Map<string, typeof dbMatches[0]>()
  for (const m of dbMatches ?? []) {
    if (m.fd_match_id) byFdId.set(m.fd_match_id, m)
    if (m.home_team_id && m.away_team_id) {
      byTeamPair.set(`${m.home_team_id}:${m.away_team_id}`, m)
    }
  }

  let updated = 0
  let linked = 0
  let skipped = 0
  const errors: string[] = []

  for (const am of apiMatches) {
    const fdStatus: string = am.status
    if (fdStatus !== 'FINISHED' && fdStatus !== 'IN_PLAY' && fdStatus !== 'PAUSED') continue

    // Find our DB match — first by cached fd_match_id, then by team pair
    let dbMatch = byFdId.get(am.id)

    if (!dbMatch) {
      const homeDbId = FD_TEAM[am.homeTeam?.id]
      const awayDbId = FD_TEAM[am.awayTeam?.id]
      if (homeDbId && awayDbId) {
        dbMatch = byTeamPair.get(`${homeDbId}:${awayDbId}`)
      }
      if (!dbMatch) { skipped++; continue }

      // Cache the link so future syncs skip the lookup
      await db.from('matches').update({ fd_match_id: am.id }).eq('id', dbMatch.id)
      byFdId.set(am.id, dbMatch)
      linked++
    }

    const newStatus = fdStatus === 'FINISHED' ? 'completed' : 'live'

    // Only write if something changed
    if (dbMatch.status === newStatus && newStatus !== 'completed') continue

    const score = am.score ?? {}
    const ft = score.fullTime ?? {}
    const isPenalties = score.duration === 'PENALTY_SHOOTOUT'
    const pen = score.penalties ?? {}

    const { error } = await db.from('matches').update({
      status: newStatus,
      home_score: ft.home ?? null,
      away_score: ft.away ?? null,
      ...(newStatus === 'completed' && {
        penalties: isPenalties,
        penalty_home: isPenalties ? (pen.home ?? null) : null,
        penalty_away: isPenalties ? (pen.away ?? null) : null,
      }),
    }).eq('id', dbMatch.id)

    if (error) errors.push(`match ${dbMatch.id}: ${error.message}`)
    else updated++
  }

  return NextResponse.json({ updated, linked, skipped, errors })
}
