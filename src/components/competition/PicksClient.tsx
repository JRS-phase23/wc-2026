'use client'

import { useState, useCallback, useTransition } from 'react'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import { formatKickoff, formatCountdown, getFlagUrl } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Match, Pick, Stage, Team } from '@/types'
import { Lock, Check, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  competitionId: string
  competitionName: string
  userId: string
  matches: Match[]
  existingPicks: Pick[]
  stageLocks: Record<string, boolean>
}

interface DraftPick {
  home: string
  away: string
  advancing?: number
}

export default function PicksClient({ competitionId, competitionName, userId, matches, existingPicks, stageLocks }: Props) {
  const [activeStage, setActiveStage] = useState<Stage>(() => {
    // Default to first unlocked stage with matches
    for (const s of STAGE_ORDER) {
      const stageMatches = matches.filter(m => m.stage === s)
      if (stageMatches.length > 0 && !stageLocks[s]) return s
    }
    return 'group'
  })

  // Draft state: matchId -> {home, away}
  const [drafts, setDrafts] = useState<Record<number, DraftPick>>(() => {
    const init: Record<number, DraftPick> = {}
    for (const p of existingPicks) {
      init[p.match_id] = { home: String(p.home_score_pick), away: String(p.away_score_pick), advancing: p.advancing_team_id ?? undefined }
    }
    return init
  })

  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  function setDraft(matchId: number, field: 'home' | 'away', value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 2)
    setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], [field]: clean } }))
    setSaved(prev => { const s = new Set(prev); s.delete(matchId); return s })
  }

  function setAdvancing(matchId: number, teamId: number) {
    setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], advancing: teamId } }))
  }

  async function savePick(matchId: number) {
    const draft = drafts[matchId]
    if (!draft || draft.home === '' || draft.away === '') return

    const homeVal = parseInt(draft.home)
    const awayVal = parseInt(draft.away)
    if (isNaN(homeVal) || isNaN(awayVal)) return

    setSaving(prev => new Set(prev).add(matchId))
    const supabase = createClient()

    const { error } = await supabase.from('picks').upsert({
      user_id: userId,
      competition_id: competitionId,
      match_id: matchId,
      home_score_pick: homeVal,
      away_score_pick: awayVal,
      advancing_team_id: draft.advancing ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,competition_id,match_id' })

    setSaving(prev => { const s = new Set(prev); s.delete(matchId); return s })
    if (error) {
      setErrors(prev => ({ ...prev, [matchId]: 'Save failed' }))
    } else {
      setSaved(prev => new Set(prev).add(matchId))
      setErrors(prev => { const e = { ...prev }; delete e[matchId]; return e })
    }
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const locked = !!stageLocks[activeStage]

  // Group by group letter for group stage
  const groups = activeStage === 'group'
    ? [...new Set(stageMatches.map(m => m.home_team?.group_letter ?? '?'))].sort()
    : null

  const pickCount = existingPicks.length
  const totalGroup = matches.filter(m => m.stage === 'group').length

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>My Picks</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-dim)' }}>{competitionName}</p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {STAGE_ORDER.map(stage => {
          const stageHasMatches = matches.some(m => m.stage === stage)
          if (!stageHasMatches) return null
          const isLocked = !!stageLocks[stage]
          const myPicksForStage = existingPicks.filter(p => matches.find(m => m.id === p.match_id && m.stage === stage)).length
          const totalForStage = matches.filter(m => m.stage === stage).length
          const done = myPicksForStage === totalForStage

          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all',
                activeStage === stage ? 'font-semibold' : 'opacity-60 hover:opacity-80'
              )}
              style={{
                background: activeStage === stage ? 'rgba(245,197,24,0.15)' : 'var(--color-surface)',
                border: activeStage === stage ? '1px solid rgba(245,197,24,0.4)' : '1px solid var(--color-border)',
                color: activeStage === stage ? 'var(--color-gold)' : 'var(--color-text)',
              }}
            >
              {isLocked && <Lock size={11} />}
              {done && !isLocked && <Check size={11} style={{ color: 'var(--color-green-score)' }} />}
              {STAGE_LABELS[stage]}
            </button>
          )
        })}
      </div>

      {/* Lock notice */}
      {locked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.2)', color: '#ef5350' }}>
          <Lock size={14} />
          This stage is locked — picks can no longer be changed.
        </div>
      )}

      {/* Matches */}
      {activeStage === 'group' && groups ? (
        groups.map(g => (
          <GroupSection
            key={g}
            groupLetter={g}
            matches={stageMatches.filter(m => m.home_team?.group_letter === g)}
            drafts={drafts}
            saving={saving}
            saved={saved}
            errors={errors}
            locked={locked}
            onDraft={setDraft}
            onAdvancing={setAdvancing}
            onSave={savePick}
          />
        ))
      ) : (
        <div className="space-y-3">
          {stageMatches.map(match => (
            <MatchPickCard
              key={match.id}
              match={match}
              draft={drafts[match.id]}
              isSaving={saving.has(match.id)}
              isSaved={saved.has(match.id)}
              error={errors[match.id]}
              locked={locked}
              onDraft={(f, v) => setDraft(match.id, f, v)}
              onAdvancing={(t) => setAdvancing(match.id, t)}
              onSave={() => savePick(match.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group section (collapsible) ───────────────────────────────────────────────
function GroupSection({ groupLetter, matches, drafts, saving, saved, errors, locked, onDraft, onAdvancing, onSave }: {
  groupLetter: string
  matches: Match[]
  drafts: Record<number, DraftPick>
  saving: Set<number>
  saved: Set<number>
  errors: Record<number, string>
  locked: boolean
  onDraft: (id: number, f: 'home' | 'away', v: string) => void
  onAdvancing: (id: number, t: number) => void
  onSave: (id: number) => void
}) {
  const [open, setOpen] = useState(true)
  const filled = matches.filter(m => drafts[m.id]?.home !== undefined && drafts[m.id]?.away !== undefined).length

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 mb-2"
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
          Group {groupLetter}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: filled === matches.length ? 'var(--color-green-score)' : 'var(--color-text-dim)' }}>
            {filled}/{matches.length}
          </span>
          {open ? <ChevronUp size={14} style={{ color: 'var(--color-text-dim)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-dim)' }} />}
        </div>
      </button>
      {open && (
        <div className="space-y-2.5">
          {matches.map(match => (
            <MatchPickCard
              key={match.id}
              match={match}
              draft={drafts[match.id]}
              isSaving={saving.has(match.id)}
              isSaved={saved.has(match.id)}
              error={errors[match.id]}
              locked={locked}
              onDraft={(f, v) => onDraft(match.id, f, v)}
              onAdvancing={(t) => onAdvancing(match.id, t)}
              onSave={() => onSave(match.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single match pick card ────────────────────────────────────────────────────
function MatchPickCard({ match, draft, isSaving, isSaved, error, locked, onDraft, onAdvancing, onSave }: {
  match: Match
  draft?: DraftPick
  isSaving: boolean
  isSaved: boolean
  error?: string
  locked: boolean
  onDraft: (f: 'home' | 'away', v: string) => void
  onAdvancing: (teamId: number) => void
  onSave: () => void
}) {
  const homeTeam = match.home_team
  const awayTeam = match.away_team
  const isCompleted = match.status === 'completed'
  const hasPick = draft?.home !== undefined && draft?.away !== undefined && draft.home !== '' && draft.away !== ''
  const pickHome = draft?.home ?? ''
  const pickAway = draft?.away ?? ''

  // For knockout draws, show advancing team selector
  const knockoutDraw = !isCompleted && match.stage !== 'group' && hasPick && pickHome === pickAway
  const needsAdvancing = knockoutDraw && !draft?.advancing

  // Score result indicator after result known
  let resultBadge: React.ReactNode = null
  if (isCompleted && hasPick && match.home_score != null && match.away_score != null) {
    const actualResult = match.home_score > match.away_score ? 'home' : match.home_score < match.away_score ? 'away' : 'draw'
    const pickResult = parseInt(pickHome) > parseInt(pickAway) ? 'home' : parseInt(pickHome) < parseInt(pickAway) ? 'away' : 'draw'
    const exact = parseInt(pickHome) === match.home_score && parseInt(pickAway) === match.away_score
    if (exact) resultBadge = <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,135,90,0.2)', color: 'var(--color-green-score)' }}>Exact ✓</span>
    else if (actualResult === pickResult) resultBadge = <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,197,24,0.15)', color: 'var(--color-gold)' }}>Result ✓</span>
    else resultBadge = <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(229,57,53,0.1)', color: '#ef5350' }}>Miss</span>
  }

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: 'var(--color-surface)', border: `1px solid ${isSaved ? 'rgba(0,135,90,0.4)' : 'var(--color-border)'}` }}
    >
      {/* Date + venue */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {formatKickoff(match.kickoff_at)} · {match.venue}
        </span>
        {resultBadge}
        {!isCompleted && !locked && (
          <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            {formatCountdown(match.kickoff_at)}
          </span>
        )}
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {homeTeam?.flag_code && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getFlagUrl(homeTeam.flag_code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
          )}
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {homeTeam?.name ?? match.home_label}
          </span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCompleted ? (
            <div className="flex items-center gap-1.5">
              {hasPick && (
                <span className="text-base font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)', minWidth: 28, textAlign: 'center' }}>
                  {pickHome}–{pickAway}
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>vs</span>
              <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {match.home_score}–{match.away_score}
              </span>
            </div>
          ) : locked ? (
            <div className="flex items-center gap-1.5">
              {hasPick
                ? <span className="text-base font-bold px-3 py-1.5 rounded-xl" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>{pickHome}–{pickAway}</span>
                : <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>No pick</span>
              }
              <Lock size={13} style={{ color: 'var(--color-text-dim)' }} />
            </div>
          ) : (
            <>
              <input
                type="number"
                min={0}
                max={99}
                value={pickHome}
                onChange={e => onDraft('home', e.target.value)}
                onBlur={() => hasPick && onSave()}
                placeholder="0"
                className="w-11 text-center text-lg font-bold rounded-xl py-2 outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-dim)' }}>–</span>
              <input
                type="number"
                min={0}
                max={99}
                value={pickAway}
                onChange={e => onDraft('away', e.target.value)}
                onBlur={() => hasPick && onSave()}
                placeholder="0"
                className="w-11 text-center text-lg font-bold rounded-xl py-2 outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--color-text)' }}>
            {awayTeam?.name ?? match.away_label}
          </span>
          {awayTeam?.flag_code && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getFlagUrl(awayTeam.flag_code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Knockout: pick advancing team if draw */}
      {knockoutDraw && homeTeam && awayTeam && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>Draw → who advances?</p>
          <div className="flex gap-2">
            {[homeTeam, awayTeam].map(team => (
              <button
                key={team.id}
                onClick={() => { onAdvancing(team.id); onSave() }}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm transition-all')}
                style={{
                  background: draft?.advancing === team.id ? 'rgba(245,197,24,0.2)' : 'var(--color-surface-2)',
                  border: draft?.advancing === team.id ? '1px solid rgba(245,197,24,0.5)' : '1px solid var(--color-border)',
                  color: draft?.advancing === team.id ? 'var(--color-gold)' : 'var(--color-text)',
                }}
              >
                {team.flag_code && <img src={getFlagUrl(team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm" />}
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save state */}
      {!locked && !isCompleted && (
        <div className="flex items-center justify-end mt-2 gap-2 h-5">
          {error && <span className="text-xs" style={{ color: '#ef5350' }}>{error}</span>}
          {isSaving && <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Saving…</span>}
          {isSaved && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-green-score)' }}><Check size={11} />Saved</span>}
          {needsAdvancing && <span className="text-xs" style={{ color: 'var(--color-gold)' }}>Pick advancing team ↑</span>}
        </div>
      )}
    </div>
  )
}
