import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scoreAllPicks } from '@/lib/scoring'
import { formatKickoff, getFlagUrl } from '@/lib/utils'
import { Plus, Users, Trophy, Clock } from 'lucide-react'
import CreateCompetitionButton from '@/components/competition/CreateCompetitionButton'
import JoinCompetitionButton from '@/components/competition/JoinCompetitionButton'
import JoinCodeInput from '@/components/JoinCodeInput'
import type { Match, Pick } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_name')
    .eq('id', user.id)
    .single()

  // Fetch competitions + matches + picks in parallel
  const [{ data: adminComps }, { data: memberComps }, { data: matches }, { data: allPicks }] = await Promise.all([
    supabase.from('competitions').select('id, name, join_code, created_at').eq('admin_id', user.id).order('created_at', { ascending: false }),
    supabase.from('competition_members').select('competition_id, competitions(id, name, join_code, created_at)').eq('user_id', user.id).order('joined_at', { ascending: false }),
    supabase.from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code), away_team:teams!matches_away_team_id_fkey(id,name,flag_code)')
      .order('match_number'),
    supabase.from('picks').select('*').eq('user_id', user.id),
  ])

  const adminIds = new Set((adminComps ?? []).map(c => c.id))
  const allComps = [
    ...(adminComps ?? []).map(c => ({ ...c, isAdmin: true })),
    ...(memberComps ?? [])
      .map(m => {
        const c = (Array.isArray(m.competitions) ? m.competitions[0] : m.competitions) as { id: string; name: string; join_code: string; created_at: string } | null
        return c ? { ...c, isAdmin: false } : null
      })
      .filter((c): c is { id: string; name: string; join_code: string; created_at: string; isAdmin: boolean } => !!c)
      .filter(c => !adminIds.has(c.id)),
  ]

  const allMatches = (matches ?? []) as Match[]
  const myPicks = (allPicks ?? []) as Pick[]

  // Upcoming matches: next 48 hours
  const now = Date.now()
  const in48h = now + 48 * 60 * 60 * 1000
  const upcoming = allMatches
    .filter(m => m.status === 'scheduled' && m.kickoff_at)
    .filter(m => {
      const t = new Date(m.kickoff_at).getTime()
      return t > now && t < in48h
    })
    .slice(0, 5)

  // Per-competition: compute my rank — all competitions queried in parallel
  const compStatsList = await Promise.all(
    allComps.map(async comp => {
      const [{ data: members }, { data: compPicks }] = await Promise.all([
        supabase.from('competition_members').select('user_id').eq('competition_id', comp.id),
        supabase.from('picks').select('*').eq('competition_id', comp.id),
      ])
      const memberIds = (members ?? []).map(m => m.user_id)
      const compPicksAll = (compPicks ?? []) as Pick[]
      const scores = memberIds.map(uid => ({
        uid,
        pts: scoreAllPicks(compPicksAll.filter(p => p.user_id === uid), allMatches)
               .reduce((s, p) => s + p.points, 0),
      })).sort((a, b) => b.pts - a.pts)
      const myIdx = scores.findIndex(s => s.uid === user.id)
      return { id: comp.id, rank: myIdx + 1, total: memberIds.length, pts: scores[myIdx]?.pts ?? 0 }
    })
  )
  const compStats: Record<string, { rank: number; total: number; pts: number }> = {}
  for (const s of compStatsList) compStats[s.id] = { rank: s.rank, total: s.total, pts: s.pts }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Greeting */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {profile?.team_name ?? 'My Team'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
          Phase23 World Cup Pick&apos;em
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <CreateCompetitionButton userId={user.id} />
        <JoinCompetitionButton userId={user.id} />
      </div>

      {/* Upcoming matches */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-dim)' }}>
            <Clock size={11} /> Kicking off soon
          </p>
          <div className="space-y-2">
            {upcoming.map(m => {
              const myPick = myPicks.find(p => p.match_id === m.id)
              const kickoff = new Date(m.kickoff_at)
              const minutesUntil = Math.round((kickoff.getTime() - now) / 60000)
              const label = minutesUntil < 60
                ? `${minutesUntil}m`
                : minutesUntil < 1440
                ? `${Math.round(minutesUntil / 60)}h`
                : formatKickoff(m.kickoff_at)

              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  {/* Home */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {m.home_team?.flag_code && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFlagUrl(m.home_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
                    )}
                    <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
                      {m.home_team?.name ?? m.home_label}
                    </span>
                  </div>
                  {/* Pick / countdown */}
                  <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
                    <span className="text-xs font-mono font-bold" style={{
                      color: myPick ? 'var(--color-gold)' : 'var(--color-text-dim)',
                    }}>
                      {myPick ? `${myPick.home_score_pick}–${myPick.away_score_pick}` : '?–?'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-red-score)', fontSize: 9, fontWeight: 600 }}>
                      {label}
                    </span>
                  </div>
                  {/* Away */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-xs truncate text-right" style={{ color: 'var(--color-text)' }}>
                      {m.away_team?.name ?? m.away_label}
                    </span>
                    {m.away_team?.flag_code && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFlagUrl(m.away_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Competition list */}
      {allComps.length === 0 ? (
        <div className="py-8 stagger space-y-8">
          {/* Join path */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-dim)' }}>
              Have an invite code?
            </p>
            <JoinCodeInput />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>or start your own</span>
            <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Create path — reuse existing button */}
          <CreateCompetitionButton userId={user.id} />
        </div>
      ) : (
        <div className="space-y-3 stagger">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
            Your competitions
          </p>
          {allComps.map(comp => {
            const stats = compStats[comp.id]
            return (
              <Link
                key={comp.id}
                href={`/competition/${comp.id}`}
                className="flex items-center justify-between p-4 rounded-2xl transition-all hover:border-white/10 active:scale-[0.99]"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: comp.isAdmin ? 'rgba(239,67,35,0.15)' : 'rgba(255,255,255,0.05)' }}>
                    {comp.isAdmin
                      ? <Trophy size={18} style={{ color: 'var(--color-gold)' }} />
                      : <Users size={18} style={{ color: 'var(--color-text-dim)' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{comp.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                      {comp.isAdmin ? 'Admin · ' : ''}{comp.join_code}
                    </p>
                  </div>
                </div>
                {/* Rank + points */}
                {stats && stats.total > 0 && (
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-base font-bold" style={{ color: 'var(--color-gold)' }}>
                      {stats.pts}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--color-text-dim)' }}>pts</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                      #{stats.rank} of {stats.total}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
