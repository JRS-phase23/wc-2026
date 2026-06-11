import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scorePick, scoreAllPicks, STAGE_LABELS, STAGE_ORDER, TOURNAMENT_WINNER_BONUS } from '@/lib/scoring'
import { getFlagUrl, isLocked } from '@/lib/utils'
import type { Match, Pick, Stage } from '@/types'
import { ArrowLeft } from 'lucide-react'

export default async function H2HPage({ params }: { params: Promise<{ id: string; rivalId: string }> }) {
  const { id, rivalId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comp } = await supabase
    .from('competitions').select('id, name').eq('id', id).single()
  if (!comp) notFound()

  const { data: membership } = await supabase
    .from('competition_members').select('user_id').eq('competition_id', id).eq('user_id', user.id).single()
  if (!membership) redirect(`/competition/${id}`)

  const { data: rivalProfile } = await supabase
    .from('profiles').select('team_name').eq('id', rivalId).single()

  const [{ data: matches }, { data: myPicksData }, { data: rivalPicksData },
         { data: myPredData }, { data: rivalPredData }, { data: finalMatchData }] = await Promise.all([
    supabase.from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code), away_team:teams!matches_away_team_id_fkey(id,name,flag_code)')
      .order('match_number'),
    supabase.from('picks').select('*').eq('competition_id', id).eq('user_id', user.id),
    supabase.from('picks').select('*').eq('competition_id', id).eq('user_id', rivalId),
    supabase.from('tournament_predictions').select('team_id').eq('competition_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('tournament_predictions').select('team_id').eq('competition_id', id).eq('user_id', rivalId).maybeSingle(),
    supabase.from('matches').select('home_team_id,away_team_id,home_score,away_score,penalties,penalty_home,penalty_away,status').eq('stage','final').maybeSingle(),
  ])

  const allMatches = (matches ?? []) as Match[]
  const myPicks = (myPicksData ?? []) as Pick[]
  const rivalPicks = (rivalPicksData ?? []) as Pick[]

  // Determine tournament winner
  let tournamentWinnerId: number | null = null
  if (finalMatchData?.status === 'completed') {
    const fm = finalMatchData as { home_team_id:number; away_team_id:number; home_score:number; away_score:number; penalties:boolean; penalty_home:number|null; penalty_away:number|null }
    if (fm.penalties && fm.penalty_home != null && fm.penalty_away != null) {
      tournamentWinnerId = fm.penalty_home > fm.penalty_away ? fm.home_team_id : fm.away_team_id
    } else {
      tournamentWinnerId = fm.home_score > fm.away_score ? fm.home_team_id : fm.away_team_id
    }
  }

  const myScoredAll = scoreAllPicks(myPicks, allMatches)
  const rivalScoredAll = scoreAllPicks(rivalPicks, allMatches)

  const myTournamentBonus = tournamentWinnerId && myPredData?.team_id === tournamentWinnerId ? TOURNAMENT_WINNER_BONUS : 0
  const rivalTournamentBonus = tournamentWinnerId && rivalPredData?.team_id === tournamentWinnerId ? TOURNAMENT_WINNER_BONUS : 0

  const myTotal = myScoredAll.reduce((s, p) => s + p.points, 0) + myTournamentBonus
  const rivalTotal = rivalScoredAll.reduce((s, p) => s + p.points, 0) + rivalTournamentBonus

  const matchMap = new Map(allMatches.map(m => [m.id, m]))
  const myScoredMap = new Map(myScoredAll.map(s => [s.match_id, s]))
  const rivalScoredMap = new Map(rivalScoredAll.map(s => [s.match_id, s]))

  // ── Agreement stats ───────────────────────────────────────────────────────
  const myPickMap = new Map(myPicks.map(p => [p.match_id, p]))
  const rivalPickMap = new Map(rivalPicks.map(p => [p.match_id, p]))

  let agreedWinner = 0
  let exactSame = 0
  let bothCorrect = 0
  let matchesCompared = 0

  for (const match of allMatches) {
    const mp = myPickMap.get(match.id)
    const rp = rivalPickMap.get(match.id)
    if (!mp || !rp) continue
    matchesCompared++

    const myW = mp.home_score_pick > mp.away_score_pick ? 'H' : mp.home_score_pick < mp.away_score_pick ? 'A' : 'D'
    const rvW = rp.home_score_pick > rp.away_score_pick ? 'H' : rp.home_score_pick < rp.away_score_pick ? 'A' : 'D'
    if (myW === rvW) agreedWinner++
    if (mp.home_score_pick === rp.home_score_pick && mp.away_score_pick === rp.away_score_pick) exactSame++

    if (match.status === 'completed') {
      const ms = myScoredMap.get(match.id)
      const rs = rivalScoredMap.get(match.id)
      const myGot = (ms?.points ?? 0) > 0
      const rvGot = (rs?.points ?? 0) > 0
      if (myGot && rvGot) bothCorrect++
    }
  }

  // Points by stage
  const stageBreakdown = STAGE_ORDER.map(stage => {
    const myPts = myScoredAll.filter(s => matchMap.get(s.match_id)?.stage === stage).reduce((t, s) => t + s.points, 0)
      + (stage === 'final' ? myTournamentBonus : 0)
    const rivalPts = rivalScoredAll.filter(s => matchMap.get(s.match_id)?.stage === stage).reduce((t, s) => t + s.points, 0)
      + (stage === 'final' ? rivalTournamentBonus : 0)
    const hasMatches = allMatches.some(m => m.stage === stage && m.status === 'completed')
    return { stage, myPts, rivalPts, hasMatches }
  }).filter(s => s.hasMatches)

  const completedMatches = allMatches.filter(m => m.status === 'completed')
  const inProgressMatches = allMatches.filter(m => isLocked(m.kickoff_at) && m.status !== 'completed')
  const upcomingMatches = allMatches.filter(m => !isLocked(m.kickoff_at))

  const myName = 'You'
  const rivalName = rivalProfile?.team_name ?? 'Rival'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/competition/${id}`}
        className="inline-flex items-center gap-1.5 text-sm mb-5"
        style={{ color: 'var(--color-text-dim)' }}>
        <ArrowLeft size={15} /> {comp.name}
      </Link>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold mb-0.5" style={{ color: 'var(--color-text)' }}>
          Head to Head
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          {myName} vs {rivalName}
        </p>
      </div>

      {/* Overall scoreboard */}
      <div className="rounded-2xl p-5 mb-4 flex items-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex-1 text-center">
          <div className="text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>{myTotal}</div>
          <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--color-gold)' }}>You</div>
        </div>
        <div className="px-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-dim)' }}>pts</div>
          {myTotal !== rivalTotal && (
            <div className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: myTotal > rivalTotal ? 'rgba(0,135,90,0.15)' : 'rgba(248,113,113,0.15)',
                color: myTotal > rivalTotal ? 'var(--color-green-score)' : 'var(--color-red-score)',
              }}>
              {myTotal > rivalTotal ? `▲ +${myTotal - rivalTotal}` : `▼ ${myTotal - rivalTotal}`}
            </div>
          )}
          {myTotal === rivalTotal && <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Tied</div>}
        </div>
        <div className="flex-1 text-center">
          <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{rivalTotal}</div>
          <div className="text-xs mt-1 font-semibold truncate" style={{ color: 'var(--color-text-dim)' }}>{rivalName}</div>
        </div>
      </div>

      {/* Pick agreement stats */}
      {matchesCompared > 0 && (
        <div className="rounded-2xl px-4 py-3 mb-6 grid grid-cols-3 gap-2 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{agreedWinner}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>same winner</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{exactSame}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>exact same score</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{bothCorrect}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>both correct</div>
          </div>
        </div>
      )}

      {/* Stage breakdown */}
      {stageBreakdown.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
            Stage Breakdown
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {stageBreakdown.map((s, i) => (
              <div key={s.stage} className="flex items-center px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {STAGE_LABELS[s.stage as Stage]}
                </span>
                <span className="text-sm font-bold w-10 text-center" style={{
                  color: s.myPts > s.rivalPts ? 'var(--color-green-score)' : s.myPts < s.rivalPts ? 'var(--color-red-score)' : 'var(--color-text)',
                }}>
                  {s.myPts}
                </span>
                <span className="text-xs mx-2" style={{ color: 'var(--color-text-dim)' }}>vs</span>
                <span className="text-sm font-bold w-10 text-center" style={{ color: 'var(--color-text-dim)' }}>
                  {s.rivalPts}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match by match */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
          Match by Match
        </p>
        <div className="space-y-2">
          {/* Completed — result + picks + points */}
          {completedMatches.map(match => {
            const mySP = myScoredMap.get(match.id) ?? null
            const rivalSP = rivalScoredMap.get(match.id) ?? null
            return (
              <div key={match.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <MatchHeader match={match} />
                <div className="flex items-center px-3 py-2 gap-2">
                  <PickCell sp={mySP} isMe />
                  <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>vs</div>
                  <PickCell sp={rivalSP} align="right" />
                </div>
              </div>
            )
          })}
          {/* Kicked off, not yet complete — picks without result */}
          {inProgressMatches.map(match => {
            const myRaw = myPickMap.get(match.id) ?? null
            const rvRaw = rivalPickMap.get(match.id) ?? null
            return (
              <div key={match.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: 0.75 }}>
                <MatchHeader match={match} pending />
                <div className="flex items-center px-3 py-2 gap-2">
                  <RawPickCell pick={myRaw} isMe />
                  <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>vs</div>
                  <RawPickCell pick={rvRaw} align="right" />
                </div>
              </div>
            )
          })}
          {/* Upcoming — picks side by side, no result yet */}
          {upcomingMatches.map(match => {
            const myRaw = myPickMap.get(match.id) ?? null
            const rvRaw = rivalPickMap.get(match.id) ?? null
            return (
              <div key={match.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <MatchHeader match={match} pending />
                <div className="flex items-center px-3 py-2 gap-2">
                  <RawPickCell pick={myRaw} isMe />
                  <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>vs</div>
                  <RawPickCell pick={rvRaw} align="right" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MatchHeader({ match, pending }: { match: Match; pending?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2"
      style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {match.home_team?.flag_code && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getFlagUrl(match.home_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
        )}
        <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{match.home_team?.name ?? match.home_label}</span>
      </div>
      <span className="text-sm font-bold mx-2 flex-shrink-0" style={{ color: 'var(--color-text)' }}>
        {pending ? '–' : `${match.home_score}–${match.away_score}`}
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-xs truncate text-right" style={{ color: 'var(--color-text)' }}>{match.away_team?.name ?? match.away_label}</span>
        {match.away_team?.flag_code && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getFlagUrl(match.away_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
        )}
      </div>
    </div>
  )
}

function PickCell({ sp, isMe, align = 'left' }: {
  sp: { home_score_pick: number; away_score_pick: number; points: number; breakdown: { exact: number; result: number } } | null
  isMe?: boolean; align?: 'left' | 'right'
}) {
  if (!sp) return <div className="flex-1 text-xs" style={{ color: 'var(--color-text-dim)', textAlign: align }}>No pick</div>
  const isExact = sp.breakdown.exact > 0
  const isResult = sp.breakdown.result > 0 && !isExact
  const color = isExact ? 'var(--color-green-score)' : isResult ? 'var(--color-gold)' : 'var(--color-red-score)'
  return (
    <div className="flex-1" style={{ textAlign: align }}>
      <span className="font-mono text-sm font-bold" style={{ color: isMe ? 'var(--color-gold)' : color }}>
        {sp.home_score_pick}–{sp.away_score_pick}
      </span>
      {sp.points > 0 && (
        <span className="text-xs ml-1" style={{ color }}>+{sp.points}</span>
      )}
    </div>
  )
}

function RawPickCell({ pick, isMe, align = 'left' }: {
  pick: Pick | null; isMe?: boolean; align?: 'left' | 'right'
}) {
  if (!pick) return <div className="flex-1 text-xs" style={{ color: 'var(--color-text-dim)', textAlign: align }}>No pick</div>
  return (
    <div className="flex-1" style={{ textAlign: align }}>
      <span className="font-mono text-sm font-bold" style={{ color: isMe ? 'var(--color-gold)' : 'var(--color-text-dim)' }}>
        {pick.home_score_pick}–{pick.away_score_pick}
      </span>
    </div>
  )
}
