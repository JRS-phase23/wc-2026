import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scorePick, STAGE_LABELS } from '@/lib/scoring'
import { getFlagUrl, isStageLocked } from '@/lib/utils'
import type { Match, Pick, Stage } from '@/types'
import { ArrowLeft } from 'lucide-react'

export default async function RevealPage({ params }: { params: Promise<{ id: string; stage: string }> }) {
  const { id, stage } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comp } = await supabase
    .from('competitions').select('id, name').eq('id', id).single()
  if (!comp) notFound()

  const { data: membership } = await supabase
    .from('competition_members').select('user_id').eq('competition_id', id).eq('user_id', user.id).single()
  if (!membership) redirect(`/competition/${id}`)

  const [{ data: members }, { data: matches }, { data: picks }] = await Promise.all([
    supabase.from('competition_members').select('user_id, profiles(team_name)').eq('competition_id', id),
    supabase.from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code), away_team:teams!matches_away_team_id_fkey(id,name,flag_code)')
      .eq('stage', stage).order('match_number'),
    supabase.from('picks').select('*').eq('competition_id', id).in('match_id',
      // We'll filter client-side — just fetch all for the competition
      (await supabase.from('matches').select('id').eq('stage', stage)).data?.map(m => m.id) ?? []
    ),
  ])

  const stageLabel = STAGE_LABELS[stage as Stage] ?? stage
  const allMatches = (matches ?? []) as Match[]
  const allPicks = (picks ?? []) as Pick[]

  // Build member list with team names
  const memberList = (members ?? []).map(m => ({
    user_id: m.user_id,
    team_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles as { team_name: string } | null)?.team_name ?? 'Unknown',
    isMe: m.user_id === user.id,
  })).sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0))

  // Check stage has locked (only reveal after lock)
  const allMatchesFull = (await supabase.from('matches').select('kickoff_at,stage,status').order('match_number')).data ?? []
  const locked = isStageLocked(allMatchesFull as Match[], stage as Stage)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back */}
      <Link href={`/competition/${id}`}
        className="inline-flex items-center gap-1.5 text-sm mb-5"
        style={{ color: 'var(--color-text-dim)' }}>
        <ArrowLeft size={15} /> {comp.name}
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          {stageLabel} · Pick Reveal
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
          {locked ? 'How everyone picked each match' : 'Reveals after stage locks'}
        </p>
      </div>

      {!locked ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="text-3xl mb-3">🔒</div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Not revealed yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>
            Picks are hidden until the stage locks
          </p>
        </div>
      ) : allMatches.length === 0 ? (
        <p className="text-center py-10" style={{ color: 'var(--color-text-dim)' }}>No matches for this stage</p>
      ) : (
        <div className="space-y-4">
          {allMatches.map(match => {
            const isCompleted = match.status === 'completed'
            const matchPicks = allPicks.filter(p => p.match_id === match.id)

            return (
              <div key={match.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* Match header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.home_team?.flag_code && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFlagUrl(match.home_team.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {match.home_team?.name ?? match.home_label}
                    </span>
                  </div>
                  <div className="flex-shrink-0 mx-3 text-center">
                    {isCompleted
                      ? <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                          {match.home_score}–{match.away_score}
                        </span>
                      : <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-dim)' }}>
                          TBD
                        </span>
                    }
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--color-text)' }}>
                      {match.away_team?.name ?? match.away_label}
                    </span>
                    {match.away_team?.flag_code && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFlagUrl(match.away_team.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Player picks */}
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {memberList.map(member => {
                    const pick = matchPicks.find(p => p.user_id === member.user_id)
                    const scored = pick && isCompleted ? scorePick(pick, match) : null
                    const isExact = scored && scored.breakdown.exact > 0
                    const isResult = scored && scored.breakdown.result > 0 && !isExact
                    const isMiss = scored && scored.breakdown.result === 0

                    let pickColor = 'var(--color-text-dim)'
                    let bgColor = 'transparent'
                    if (isExact) { pickColor = 'var(--color-green-score)'; bgColor = 'rgba(0,135,90,0.06)' }
                    else if (isResult) { pickColor = 'var(--color-gold)'; bgColor = 'rgba(239,67,35,0.06)' }
                    else if (isMiss) { pickColor = 'var(--color-red-score)'; bgColor = 'rgba(248,113,113,0.06)' }

                    return (
                      <div key={member.user_id}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{ background: bgColor }}>
                        <span className="text-sm font-medium" style={{ color: member.isMe ? 'var(--color-gold)' : 'var(--color-text)' }}>
                          {member.team_name} {member.isMe && <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>(you)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          {pick ? (
                            <>
                              <span className="font-mono text-sm font-semibold" style={{ color: pickColor }}>
                                {pick.home_score_pick}–{pick.away_score_pick}
                              </span>
                              {scored && (
                                <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ color: pickColor, background: bgColor ? bgColor : undefined }}>
                                  {isExact ? 'Exact ✓' : isResult ? 'Result ✓' : isMiss ? 'Miss' : ''}
                                  {scored.points > 0 ? ` +${scored.points}` : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>No pick</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
