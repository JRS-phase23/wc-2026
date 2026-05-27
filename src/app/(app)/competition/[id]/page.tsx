import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scoreAllPicks } from '@/lib/scoring'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import LeaderboardTable from '@/components/competition/LeaderboardTable'
import StageProgressBar from '@/components/competition/StageProgressBar'
import type { Stage, Match, Pick } from '@/types'
import { ClipboardCopy, Settings, Target } from 'lucide-react'
import CopyCodeButton from '@/components/competition/CopyCodeButton'

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load competition
  const { data: comp } = await supabase
    .from('competitions')
    .select('id, name, join_code, admin_id')
    .eq('id', id)
    .single()
  if (!comp) notFound()

  // Check membership
  const { data: membership } = await supabase
    .from('competition_members')
    .select('user_id')
    .eq('competition_id', id)
    .eq('user_id', user.id)
    .single()
  if (!membership && comp.admin_id !== user.id) redirect('/dashboard')

  // Load all members + profiles
  const { data: members } = await supabase
    .from('competition_members')
    .select('user_id, profiles(team_name)')
    .eq('competition_id', id)

  // Load all completed matches
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code), away_team:teams!matches_away_team_id_fkey(id,name,flag_code)')
    .order('match_number')

  // Load all picks for this competition
  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('competition_id', id)

  const allMatches = (matches ?? []) as Match[]
  const allPicks = (picks ?? []) as Pick[]

  // Build leaderboard
  const leaderboard = (members ?? []).map(m => {
    const profile = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { team_name: string } | null
    const userPicks = allPicks.filter(p => p.user_id === m.user_id)
    const scored = scoreAllPicks(userPicks, allMatches)

    const stage_points: Record<string, number> = {}
    for (const stage of STAGE_ORDER) stage_points[stage] = 0

    for (const sp of scored) {
      const match = allMatches.find(m => m.id === sp.match_id)
      if (match) stage_points[match.stage] = (stage_points[match.stage] ?? 0) + sp.points
    }

    const completedPicks = scored.filter(s => s.points > 0 || allMatches.find(m => m.id === s.match_id)?.status === 'completed')
    const correctResult = scored.filter(s => s.breakdown.result > 0).length
    const exactScore = scored.filter(s => s.breakdown.exact > 0).length
    const totalCompleted = scored.filter(s => allMatches.find(m => m.id === s.match_id)?.status === 'completed').length

    return {
      user_id: m.user_id,
      team_name: profile?.team_name ?? 'Unknown',
      total_points: scored.reduce((sum, s) => sum + s.points, 0),
      stage_points,
      accuracy: {
        total_picks: totalCompleted,
        correct_result: correctResult,
        exact_score: exactScore,
      },
    }
  }).sort((a, b) => b.total_points - a.total_points)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  const myEntry = leaderboard.find(e => e.user_id === user.id)
  const isAdmin = comp.admin_id === user.id

  // Stage progress
  const completedByStage: Record<string, { done: number; total: number }> = {}
  for (const stage of STAGE_ORDER) {
    const stageMatches = allMatches.filter(m => m.stage === stage)
    completedByStage[stage] = {
      done: stageMatches.filter(m => m.status === 'completed').length,
      total: stageMatches.length,
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{comp.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <CopyCodeButton code={comp.join_code} />
              {isAdmin && (
                <Link href={`/competition/${id}/admin`} className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--color-text-dim)' }}>
                  <Settings size={12} />
                  Manage
                </Link>
              )}
            </div>
          </div>
          {myEntry && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>{myEntry.total_points}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                Rank #{myEntry.rank} of {leaderboard.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My picks CTA */}
      <Link
        href={`/competition/${id}/picks`}
        className="flex items-center justify-between p-4 rounded-2xl mb-6 transition-all hover:opacity-90 active:scale-[0.99]"
        style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.2) 0%, rgba(245,197,24,0.08) 100%)', border: '1px solid rgba(245,197,24,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,197,24,0.2)' }}>
            <Target size={18} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>My Picks</p>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {allPicks.filter(p => p.user_id === user.id).length} submitted
            </p>
          </div>
        </div>
        <span className="text-lg" style={{ color: 'var(--color-gold)' }}>›</span>
      </Link>

      {/* Stage progress */}
      <StageProgressBar completedByStage={completedByStage} />

      {/* Leaderboard */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
          Leaderboard · {leaderboard.length} players
        </p>
        <LeaderboardTable entries={leaderboard} currentUserId={user.id} />
      </div>
    </div>
  )
}
