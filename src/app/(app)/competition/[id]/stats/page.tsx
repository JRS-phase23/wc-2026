import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { scoreAllPicks } from '@/lib/scoring'
import { STAGE_ORDER } from '@/lib/scoring'
import StatsClient from '@/components/charts/StatsClient'
import type { Match, Pick } from '@/types'

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comp } = await supabase.from('competitions').select('id,name,admin_id').eq('id', id).single()
  if (!comp) notFound()

  const { data: membership } = await supabase
    .from('competition_members').select('user_id').eq('competition_id', id).eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const { data: members } = await supabase
    .from('competition_members')
    .select('user_id, profiles(team_name)')
    .eq('competition_id', id)

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_number')

  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('competition_id', id)

  const allMatches = (matches ?? []) as Match[]
  const allPicks = (picks ?? []) as Pick[]
  const completedMatches = allMatches.filter(m => m.status === 'completed').sort((a, b) => a.match_number - b.match_number)

  // Build per-player data
  const playerData = (members ?? []).map(m => {
    const profile = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { team_name: string } | null
    const userPicks = allPicks.filter(p => p.user_id === m.user_id)
    const scored = scoreAllPicks(userPicks, allMatches)

    // Cumulative points over time (per completed match)
    let cumulative = 0
    const timeline = completedMatches.map(match => {
      const sp = scored.find(s => s.match_id === match.id)
      cumulative += sp?.points ?? 0
      return { match_number: match.match_number, stage: match.stage, cumulative }
    })

    // Stage breakdown
    const stageBreakdown: Record<string, number> = {}
    for (const stage of STAGE_ORDER) {
      const stagePicks = scored.filter(s => allMatches.find(m => m.id === s.match_id && m.stage === stage))
      stageBreakdown[stage] = stagePicks.reduce((sum, s) => sum + s.points, 0)
    }

    // Accuracy
    const completedPicks = scored.filter(s => completedMatches.some(m => m.id === s.match_id))
    const correctResult = completedPicks.filter(s => s.breakdown.result > 0).length
    const exactScore = completedPicks.filter(s => s.breakdown.exact > 0).length
    const total = completedPicks.length

    return {
      user_id: m.user_id,
      team_name: profile?.team_name ?? 'Unknown',
      total_points: scored.reduce((sum, s) => sum + s.points, 0),
      timeline,
      stageBreakdown,
      accuracy: { total, correctResult, exactScore },
    }
  }).sort((a, b) => b.total_points - a.total_points)

  return (
    <StatsClient
      competitionName={comp.name}
      playerData={playerData}
      currentUserId={user.id}
      completedMatchCount={completedMatches.length}
    />
  )
}
