'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STAGE_LABELS, STAGE_ORDER, scorePick, getMaxPossiblePoints } from '@/lib/scoring'
import { formatKickoff, formatCountdown, getFlagUrl, buildGroupStandings, getStageFirstKickoff } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Match, Pick, Stage, Team, StageSubmission, TournamentPrediction } from '@/types'
import { Lock, Check, ChevronDown, ChevronUp, Send, Pencil, AlertCircle, LayoutList, TableProperties, ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  competitionId: string
  competitionName: string
  teamName: string
  userId: string
  matches: Match[]
  existingPicks: Pick[]
  stageLocks: Record<string, boolean>
  stageSubmissions: StageSubmission[]
  allTeams: Team[]
  tournamentPrediction: TournamentPrediction | null
}

interface DraftPick {
  home: string
  away: string
  advancing?: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type StageView = 'picks' | 'standings'

export default function PicksClient({
  competitionId, competitionName, teamName, userId, matches, existingPicks, stageLocks, stageSubmissions,
  allTeams, tournamentPrediction,
}: Props) {
  const router = useRouter()

  const [activeStage, setActiveStage] = useState<Stage>(() => {
    for (const s of STAGE_ORDER) {
      const stageMatches = matches.filter(m => m.stage === s)
      if (stageMatches.length > 0 && !stageLocks[s]) return s
    }
    return 'group'
  })

  const [drafts, setDrafts] = useState<Record<number, DraftPick>>(() => {
    const init: Record<number, DraftPick> = {}
    for (const p of existingPicks) {
      init[p.match_id] = {
        home: String(p.home_score_pick),
        away: String(p.away_score_pick),
        advancing: p.advancing_team_id ?? undefined,
      }
    }
    return init
  })

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [submissions, setSubmissions] = useState<Set<Stage>>(
    new Set(stageSubmissions.map(s => s.stage as Stage))
  )
  const [submitting, setSubmitting] = useState(false)
  const [successStage, setSuccessStage] = useState<Stage | null>(null)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [scoringOpen, setScoringOpen] = useState(false)
  const [stageView, setStageView] = useState<StageView>('picks')
  const [tournamentTeamId, setTournamentTeamId] = useState<number | null>(tournamentPrediction?.team_id ?? null)
  const [savingTournament, setSavingTournament] = useState(false)

  // Debounce timer refs for global save status
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-redirect after success overlay
  useEffect(() => {
    if (!successStage) return
    const t = setTimeout(() => {
      setSuccessStage(null)
      router.push(`/competition/${competitionId}`)
    }, 3500)
    return () => clearTimeout(t)
  }, [successStage, router, competitionId])

  function setDraft(matchId: number, field: 'home' | 'away', value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 2)
    setDrafts(prev => ({ ...prev, [matchId]: { ...(prev[matchId] ?? { home: '0', away: '0' }), [field]: clean } }))
    setSaveStatus('idle')
  }

  function setAdvancing(matchId: number, teamId: number) {
    setDrafts(prev => ({ ...prev, [matchId]: { ...(prev[matchId] ?? { home: '0', away: '0' }), advancing: teamId } }))
  }

  async function savePick(matchId: number) {
    const draft = drafts[matchId]
    // Treat empty string as 0
    const homeVal = parseInt(draft?.home || '0')
    const awayVal = parseInt(draft?.away || '0')
    if (isNaN(homeVal) || isNaN(awayVal)) return

    setSaveStatus('saving')

    const supabase = createClient()
    const { error } = await supabase.from('picks').upsert({
      user_id: userId,
      competition_id: competitionId,
      match_id: matchId,
      home_score_pick: homeVal,
      away_score_pick: awayVal,
      advancing_team_id: draft?.advancing ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,competition_id,match_id' })

    if (error) {
      setSaveStatus('error')
      setErrors(prev => ({ ...prev, [matchId]: 'Save failed' }))
    } else {
      setErrors(prev => { const e = { ...prev }; delete e[matchId]; return e })
      setSaveStatus('saved')
      // Clear 'saved' indicator after 3s inactivity
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  /** Save all picks for a stage (treating empty as 0), then mark stage submitted */
  async function submitStage(stage: Stage) {
    setSubmitting(true)
    const stageMatches = matches.filter(m => m.stage === stage)
    const supabase = createClient()

    // Upsert all picks in bulk
    const rows = stageMatches.map(m => {
      const d = drafts[m.id]
      return {
        user_id: userId,
        competition_id: competitionId,
        match_id: m.id,
        home_score_pick: parseInt(d?.home || '0'),
        away_score_pick: parseInt(d?.away || '0'),
        advancing_team_id: d?.advancing ?? null,
        updated_at: new Date().toISOString(),
      }
    })

    const { error: picksError } = await supabase
      .from('picks')
      .upsert(rows, { onConflict: 'user_id,competition_id,match_id' })

    if (picksError) {
      setSubmitting(false)
      return
    }

    // Record submission
    const { error: subError } = await supabase.from('stage_submissions').insert({
      competition_id: competitionId,
      user_id: userId,
      stage,
    })

    setSubmitting(false)
    if (!subError) {
      setSubmissions(prev => new Set([...prev, stage]))
      setSaveStatus('saved')
      setSuccessStage(stage)
    }
  }

  async function saveTournamentPick(teamId: number) {
    setTournamentTeamId(teamId)
    setSavingTournament(true)
    const supabase = createClient()
    await supabase.from('tournament_predictions').upsert({
      competition_id: competitionId,
      user_id: userId,
      team_id: teamId,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'competition_id,user_id' })
    setSavingTournament(false)
  }

  /** Remove submission record so player can edit again */
  async function unsubmitStage(stage: Stage) {
    const supabase = createClient()
    await supabase
      .from('stage_submissions')
      .delete()
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .eq('stage', stage)
    setSubmissions(prev => { const s = new Set(prev); s.delete(stage); return s })
    setEditingStage(stage)
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const locked = !!stageLocks[activeStage]
  const submitted = submissions.has(activeStage)

  const groups = activeStage === 'group'
    ? [...new Set(stageMatches.map(m => m.home_team?.group_letter ?? '?'))].sort()
    : null

  const groupStandings = buildGroupStandings(matches)

  // Deadline for the active stage
  const activeDeadline = getStageFirstKickoff(matches, activeStage)

  return (
    <>
    {/* ── Success overlay ──────────────────────────────────────────────── */}
    {successStage && (
      <div className="fixed inset-0 z-[100] overflow-hidden flex flex-col items-center justify-center text-center px-6"
        style={{ background: 'var(--color-bg)' }}>
        {/* Vintage celebration photo */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "url('/images/vintage-wc-celebration.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          opacity: 0.2,
          filter: 'grayscale(1)',
          mixBlendMode: 'screen',
        }} />
        {/* Green bloom */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 110% 55% at 50% 0%, rgba(0,160,100,0.55) 0%, transparent 65%)',
        }} />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-6xl mb-5">✅</div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#fff' }}>Picks locked in!</h1>
          <p className="text-lg mb-1 font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {STAGE_LABELS[successStage]}
          </p>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
            You can still edit picks until the first match kicks off
          </p>
          <button
            onClick={() => { setSuccessStage(null); router.push(`/competition/${competitionId}`) }}
            className="px-8 py-4 rounded-2xl font-bold text-base transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}
          >
            ← Back to {competitionName}
          </button>
          <p className="text-xs mt-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Redirecting in a moment…
          </p>
        </div>
      </div>
    )}

    <div className="max-w-lg mx-auto px-4 py-6" style={{ paddingBottom: (!locked && (!submitted || editingStage === activeStage)) ? '6rem' : undefined }}>
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <Link href={`/competition/${competitionId}`}
          className="inline-flex items-center gap-1.5 text-xs mb-3"
          style={{ color: 'var(--color-text-dim)' }}>
          <ArrowLeft size={13} /> {competitionName}
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{teamName}</h1>
      </div>

      {/* Global save status bar */}
      <SaveStatusBar status={saveStatus} />

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-1 no-scrollbar">
        {STAGE_ORDER.map(stage => {
          const stageHasMatches = matches.some(m => m.stage === stage)
          if (!stageHasMatches) return null
          const isLocked = !!stageLocks[stage]
          const isSubmitted = submissions.has(stage)

          return (
            <button
              key={stage}
              onClick={() => { setActiveStage(stage); setStageView('picks') }}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all',
                activeStage === stage ? 'font-semibold' : 'opacity-60 hover:opacity-80'
              )}
              style={{
                background: activeStage === stage
                  ? isSubmitted ? 'rgba(0,135,90,0.2)' : 'rgba(239,67,35,0.15)'
                  : 'var(--color-surface)',
                border: activeStage === stage
                  ? isSubmitted ? '1px solid rgba(0,135,90,0.5)' : '1px solid rgba(239,67,35,0.4)'
                  : isSubmitted ? '1px solid rgba(0,135,90,0.3)' : '1px solid var(--color-border)',
                color: activeStage === stage
                  ? isSubmitted ? 'var(--color-green-score)' : 'var(--color-gold)'
                  : isSubmitted ? 'var(--color-green-score)' : 'var(--color-text)',
              }}
            >
              {isLocked && !isSubmitted && <Lock size={11} />}
              {isSubmitted && <Check size={11} />}
              {STAGE_LABELS[stage]}
            </button>
          )
        })}
      </div>

      {/* Picks / Standings toggle — all stages */}
      <div className="flex gap-1 mb-5 mt-3">
        <button
          onClick={() => setStageView('picks')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all')}
          style={{
            background: stageView === 'picks' ? 'var(--color-surface-2)' : 'transparent',
            color: stageView === 'picks' ? 'var(--color-text)' : 'var(--color-text-dim)',
            border: stageView === 'picks' ? '1px solid var(--color-border)' : '1px solid transparent',
          }}
        >
          <LayoutList size={13} /> My Picks
        </button>
        <button
          onClick={() => setStageView('standings')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all')}
          style={{
            background: stageView === 'standings' ? 'var(--color-surface-2)' : 'transparent',
            color: stageView === 'standings' ? 'var(--color-text)' : 'var(--color-text-dim)',
            border: stageView === 'standings' ? '1px solid var(--color-border)' : '1px solid transparent',
          }}
        >
          <TableProperties size={13} /> Group Standings
        </button>
      </div>

      {/* Scoring guide — collapsible */}
      {stageView === 'picks' && (
        <div className="mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setScoringOpen(o => !o)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)' }}
          >
            <span className="flex items-center gap-1.5"><Info size={12} /> How scoring works</span>
            {scoringOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {scoringOpen && (
            <div className="px-3.5 py-3 space-y-1.5 text-xs" style={{ background: 'var(--color-surface)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text)' }}>🎯 Exact scoreline</span><span className="font-bold" style={{ color: 'var(--color-gold)' }}>20 pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-dim)' }}>✓ Correct result + goal diff</span><span className="font-bold" style={{ color: 'var(--color-text-dim)' }}>10 pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-dim)' }}>✓ Correct result only</span><span className="font-bold" style={{ color: 'var(--color-text-dim)' }}>5 pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-dim)' }}>≈ Close score (4+ goal game, off by ≤1)</span><span className="font-bold" style={{ color: 'var(--color-text-dim)' }}>+3 pts</span></div>
              <div className="pt-1" style={{ borderTop: '1px solid var(--color-border)' }} />
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-dim)' }}>🥊 Knockout: correct advancing team</span><span className="font-bold" style={{ color: 'var(--color-text-dim)' }}>+10 pts</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-dim)' }}>🏆 Tournament winner prediction</span><span className="font-bold" style={{ color: 'var(--color-gold)' }}>+25 pts</span></div>
            </div>
          )}
        </div>
      )}

      {/* Stage points summary */}
      {stageView === 'picks' && (() => {
        const completed = stageMatches.filter(m => m.status === 'completed')
        if (!completed.length) return null
        let earned = 0, possible = 0
        for (const m of completed) {
          const pick = existingPicks.find(p => p.match_id === m.id)
          if (pick) earned += scorePick(pick, m).points
          possible += getMaxPossiblePoints(m)
        }
        const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0
        return (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-4 text-sm"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>
              {STAGE_LABELS[activeStage]} · {completed.length}/{stageMatches.length} played
            </span>
            <span className="font-bold" style={{ color: earned > 0 ? 'var(--color-gold)' : 'var(--color-text-dim)' }}>
              {earned} <span className="font-normal text-xs" style={{ color: 'var(--color-text-dim)' }}>/ {possible} pts ({pct}%)</span>
            </span>
          </div>
        )
      })()}

      {/* Lock notice */}
      {locked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.2)', color: '#ef5350' }}>
          <Lock size={14} />
          This stage is locked — picks are final.
        </div>
      )}

      {/* Submitted notice with Edit button */}
      {submitted && !locked && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
          style={{ background: 'rgba(0,135,90,0.1)', border: '1px solid rgba(0,135,90,0.25)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-green-score)' }}>
            <Check size={14} />
            Picks submitted
          </div>
          <button
            onClick={() => unsubmitStage(activeStage)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <Pencil size={11} /> Edit Picks
          </button>
        </div>
      )}

      {/* STANDINGS VIEW */}
      {stageView === 'standings' && groupStandings && (
        <GroupStandingsView groupsData={groupStandings} />
      )}

      {/* PICKS VIEW */}
      {stageView === 'picks' && (
        <>
          {/* Tournament winner urgency callout */}
          {activeStage === 'group' && !tournamentTeamId && !stageLocks['group'] && (
            <div className="mb-3 px-4 py-3 rounded-2xl animate-fade-in"
              style={{ background: 'rgba(239,67,35,0.12)', border: '1px solid rgba(239,67,35,0.35)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-gold)' }}>
                Don&apos;t miss this!
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                Pick your tournament winner for <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>+25 bonus pts</span>
              </p>
            </div>
          )}

          {/* Tournament winner — shown only on group stage, before matches */}
          {activeStage === 'group' && (
            <TournamentWinnerPicker
              teams={allTeams}
              selectedTeamId={tournamentTeamId}
              locked={!!stageLocks['group']}
              saving={savingTournament}
              onPick={saveTournamentPick}
              onClear={() => setTournamentTeamId(null)}
            />
          )}

          {activeStage === 'group' && groups ? (
            groups.map(g => (
              <GroupSection
                key={g}
                groupLetter={g}
                matches={stageMatches.filter(m => m.home_team?.group_letter === g)}
                drafts={drafts}
                errors={errors}
                locked={locked || (submitted && editingStage !== activeStage)}
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
                  error={errors[match.id]}
                  locked={locked || (submitted && editingStage !== activeStage)}
                  onDraft={(f, v) => setDraft(match.id, f, v)}
                  onAdvancing={(t) => setAdvancing(match.id, t)}
                  onSave={() => savePick(match.id)}
                />
              ))}
            </div>
          )}

          {/* Re-submit editing notice (inline, no button — button is sticky) */}
          {!locked && submitted && editingStage === activeStage && (
            <div className="mt-6 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,67,35,0.08)', border: '1px solid rgba(239,67,35,0.2)', color: 'var(--color-gold)' }}>
              You&apos;re editing previously submitted picks. Tap <strong>Re-submit</strong> when you&apos;re done.
            </div>
          )}
        </>
      )}
    </div>

    {/* ── Sticky submit bar ──────────────────────────────────────────────── */}
    {!locked && stageView === 'picks' && (!submitted || editingStage === activeStage) && (
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-3"
        style={{
          paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, var(--color-bg) 65%, transparent)',
        }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { submitStage(activeStage); if (editingStage) setEditingStage(null) }}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}
          >
            <Send size={16} />
            {submitting
              ? 'Submitting…'
              : editingStage === activeStage
              ? `Re-submit ${STAGE_LABELS[activeStage]} Picks`
              : `Submit ${STAGE_LABELS[activeStage]} Picks`}
          </button>
          <p className="text-xs text-center mt-1.5" style={{ color: 'var(--color-text-dim)' }}>
            {activeDeadline
              ? `Locks ${formatKickoff(activeDeadline)} · scores save automatically`
              : 'Scores save automatically as you type'}
          </p>
        </div>
      </div>
    )}
    </>
  )
}

// ── Global save status bar — fixed toast at bottom, no layout shift ───────────
function SaveStatusBar({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium shadow-lg"
      style={{
        transform: 'translateX(-50%)',
        background: status === 'saved'
          ? 'rgba(0,135,90,0.95)'
          : status === 'error'
          ? 'rgba(229,57,53,0.95)'
          : 'rgba(30,30,40,0.95)',
        border: `1px solid ${status === 'saved' ? 'rgba(0,135,90,0.5)' : status === 'error' ? 'rgba(229,57,53,0.5)' : 'var(--color-border)'}`,
        color: status === 'saved' ? '#fff' : status === 'error' ? '#fff' : 'var(--color-text-dim)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {status === 'saving' && <span className="animate-pulse">●</span>}
      {status === 'saved' && <Check size={12} />}
      {status === 'error' && <AlertCircle size={12} />}
      {status === 'saving' && 'Saving…'}
      {status === 'saved' && 'All picks saved'}
      {status === 'error' && 'Save failed — check your connection'}
    </div>
  )
}

// ── Group Standings view ──────────────────────────────────────────────────────
function GroupStandingsView({ groupsData }: { groupsData: ReturnType<typeof buildGroupStandings> }) {
  return (
    <div className="space-y-6">
      {groupsData.map(group => (
        <div key={group.letter}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>
            Group {group.letter}
          </h3>
          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-dim)' }}>Team</th>
                  {['P','W','D','L','GF','GD'].map(h => (
                    <th key={h} className="text-right px-2 py-2 font-semibold uppercase tracking-wide w-8" style={{ color: 'var(--color-text-dim)' }}>{h}</th>
                  ))}
                  <th className="text-right px-3 py-2 font-bold uppercase tracking-wide w-10" style={{ color: 'var(--color-gold)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.standings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center" style={{ color: 'var(--color-text-dim)' }}>
                      No matches completed yet
                    </td>
                  </tr>
                ) : group.standings.map((row, i) => (
                  <tr key={row.team.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: i < 2 ? 'var(--color-gold)' : 'var(--color-text-dim)' }}>
                          {i + 1}
                        </span>
                        {row.team.flag_code && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getFlagUrl(row.team.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {row.team.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-2 py-2.5" style={{ color: 'var(--color-text-dim)' }}>{row.played}</td>
                    <td className="text-right px-2 py-2.5" style={{ color: 'var(--color-text-dim)' }}>{row.won}</td>
                    <td className="text-right px-2 py-2.5" style={{ color: 'var(--color-text-dim)' }}>{row.drawn}</td>
                    <td className="text-right px-2 py-2.5" style={{ color: 'var(--color-text-dim)' }}>{row.lost}</td>
                    <td className="text-right px-2 py-2.5" style={{ color: 'var(--color-text-dim)' }}>{row.goals_for}</td>
                    <td className="text-right px-2 py-2.5" style={{
                      color: row.goal_diff > 0 ? 'var(--color-green-score)' : row.goal_diff < 0 ? '#ef5350' : 'var(--color-text-dim)'
                    }}>
                      {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                    </td>
                    <td className="text-right px-3 py-2.5 font-bold text-sm" style={{ color: 'var(--color-gold)' }}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* H2H matrix */}
          {group.matches.length > 0 && (
            <H2HMatrix teams={group.standings.map(s => s.team)} matches={group.matches} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Head-to-head matrix ───────────────────────────────────────────────────────
function H2HMatrix({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const scoreFor = (homeId: number, awayId: number): string => {
    const m = matches.find(
      x => x.home_team_id === homeId && x.away_team_id === awayId
    )
    if (!m || m.home_score == null) return '–'
    return `${m.home_score}–${m.away_score}`
  }

  return (
    <div className="overflow-x-auto rounded-xl mb-1" style={{ border: '1px solid var(--color-border)' }}>
      <table className="w-full text-xs" style={{ background: 'var(--color-surface)', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th className="text-left px-2 py-1.5 font-semibold" style={{ color: 'var(--color-text-dim)', minWidth: 80 }}>H2H</th>
            {teams.map(t => (
              <th key={t.id} className="px-2 py-1.5 text-center font-medium" style={{ color: 'var(--color-text-dim)', minWidth: 44 }}>
                {t.flag_code ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFlagUrl(t.flag_code)} alt={t.name} className="w-5 h-3.5 object-cover rounded-sm mx-auto" />
                ) : t.name.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((rowTeam, ri) => (
            <tr key={rowTeam.id} style={{ borderTop: ri > 0 ? '1px solid var(--color-border)' : undefined }}>
              <td className="px-2 py-1.5 flex items-center gap-1.5">
                {rowTeam.flag_code && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFlagUrl(rowTeam.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                )}
                <span style={{ color: 'var(--color-text)' }}>{rowTeam.name}</span>
              </td>
              {teams.map(colTeam => (
                <td key={colTeam.id} className="px-2 py-1.5 text-center font-mono"
                  style={{
                    color: rowTeam.id === colTeam.id ? 'var(--color-surface-3)' : 'var(--color-text)',
                    background: rowTeam.id === colTeam.id ? 'var(--color-surface-2)' : undefined,
                  }}>
                  {rowTeam.id === colTeam.id ? '×' : scoreFor(rowTeam.id, colTeam.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Group section (collapsible) ───────────────────────────────────────────────
function GroupSection({ groupLetter, matches, drafts, errors, locked, onDraft, onAdvancing, onSave }: {
  groupLetter: string
  matches: Match[]
  drafts: Record<number, DraftPick>
  errors: Record<number, string>
  locked: boolean
  onDraft: (id: number, f: 'home' | 'away', v: string) => void
  onAdvancing: (id: number, t: number) => void
  onSave: (id: number) => void
}) {
  const [open, setOpen] = useState(true)
  const filled = matches.filter(m => {
    const d = drafts[m.id]
    return d?.home !== undefined && d?.away !== undefined
  }).length

  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-2 mb-2">
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
function MatchPickCard({ match, draft, error, locked, onDraft, onAdvancing, onSave }: {
  match: Match
  draft?: DraftPick
  error?: string
  locked: boolean
  onDraft: (f: 'home' | 'away', v: string) => void
  onAdvancing: (teamId: number) => void
  onSave: () => void
}) {
  const homeTeam = match.home_team
  const awayTeam = match.away_team
  const isCompleted = match.status === 'completed'
  const pickHome = draft?.home ?? ''
  const pickAway = draft?.away ?? ''
  const hasPick = pickHome !== '' || pickAway !== ''

  // Knockout draw advancing selector
  const knockoutDraw = !isCompleted && match.stage !== 'group' && pickHome !== '' && pickAway !== '' && pickHome === pickAway
  const needsAdvancing = knockoutDraw && !draft?.advancing

  // Score result badge
  let resultBadge: React.ReactNode = null
  if (isCompleted && hasPick && match.home_score != null && match.away_score != null) {
    const ph = parseInt(pickHome), pa = parseInt(pickAway)
    const exact = ph === match.home_score && pa === match.away_score
    const actualResult = match.home_score > match.away_score ? 'home' : match.home_score < match.away_score ? 'away' : 'draw'
    const pickResult = ph > pa ? 'home' : ph < pa ? 'away' : 'draw'
    const fakePick: Pick = { ...match as unknown as Pick, home_score_pick: ph, away_score_pick: pa, advancing_team_id: draft?.advancing ?? null }
    const pts = scorePick(fakePick, match).points
    const ptsLabel = pts > 0 ? ` +${pts}` : ''
    if (exact)
      resultBadge = <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,135,90,0.2)', color: 'var(--color-green-score)' }}>Exact ✓{ptsLabel}</span>
    else if (actualResult === pickResult)
      resultBadge = <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,67,35,0.15)', color: 'var(--color-gold)' }}>Result ✓{ptsLabel}</span>
    else
      resultBadge = <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(229,57,53,0.1)', color: '#ef5350' }}>Miss{ptsLabel}</span>
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {/* Date + venue row */}
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

      {/* Team name titles */}
      <div className="flex justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {homeTeam?.name ?? match.home_label}
        </span>
        <span className="text-sm font-semibold text-right" style={{ color: 'var(--color-text)' }}>
          {awayTeam?.name ?? match.away_label}
        </span>
      </div>

      {/* Flags + score row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home flag */}
        {homeTeam?.flag_code && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getFlagUrl(homeTeam.flag_code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
        )}

        {/* Score area */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {isCompleted ? (
            <div className="flex items-center gap-1.5">
              {hasPick && (
                <span className="text-base font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)', minWidth: 28, textAlign: 'center' }}>
                  {pickHome || '0'}–{pickAway || '0'}
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
                ? <span className="text-base font-bold px-3 py-1.5 rounded-xl" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
                    {pickHome || '0'}–{pickAway || '0'}
                  </span>
                : <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>No pick</span>
              }
              <Lock size={13} style={{ color: 'var(--color-text-dim)' }} />
            </div>
          ) : (
            <>
              <ScoreInput value={pickHome} onChange={v => onDraft('home', v)} onSave={onSave} />
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-dim)' }}>–</span>
              <ScoreInput value={pickAway} onChange={v => onDraft('away', v)} onSave={onSave} />
            </>
          )}
        </div>

        {/* Away flag */}
        {awayTeam?.flag_code && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getFlagUrl(awayTeam.flag_code)} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
        )}
      </div>

      {/* Knockout advancing selector */}
      {knockoutDraw && homeTeam && awayTeam && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>Draw → who advances?</p>
          <div className="flex gap-2">
            {[homeTeam, awayTeam].map(team => (
              <button key={team.id}
                onClick={() => { onAdvancing(team.id); onSave() }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: draft?.advancing === team.id ? 'rgba(239,67,35,0.2)' : 'var(--color-surface-2)',
                  border: draft?.advancing === team.id ? '1px solid rgba(239,67,35,0.5)' : '1px solid var(--color-border)',
                  color: draft?.advancing === team.id ? 'var(--color-gold)' : 'var(--color-text)',
                }}>
                {team.flag_code && <img src={getFlagUrl(team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm" />}
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs mt-1.5" style={{ color: '#ef5350' }}>{error}</p>
      )}
      {needsAdvancing && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-gold)' }}>Pick advancing team ↑</p>
      )}
    </div>
  )
}

// ── Score input with +/− buttons ─────────────────────────────────────────────
function ScoreInput({ value, onChange, onSave }: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
}) {
  const num = Math.max(0, Math.min(99, parseInt(value || '0') || 0))

  function adjust(delta: number) {
    const next = Math.max(0, Math.min(99, num + delta))
    onChange(String(next))
    setTimeout(onSave, 30)
  }

  // Shared button style — touch-action:manipulation removes the 300ms tap
  // delay on iOS and prevents double-tap zoom without blocking scroll.
  // onPointerDown + e.preventDefault() stops the browser from scrolling
  // the element into view (the root cause of the screen-jump bug).
  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface-3)',
    color: 'var(--color-text-dim)',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  return (
    <div className="flex items-center gap-1" style={{ touchAction: 'manipulation' }}>
      <button
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); adjust(-1) }}
        onTouchStart={e => e.preventDefault()}
        tabIndex={-1}
        className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold active:opacity-50"
        style={btnStyle}
        aria-label="decrease"
      >−</button>

      {/* Plain display — no input field, no spinners, no focus events */}
      <span
        className="text-xl font-bold text-center"
        style={{
          minWidth: '2rem',
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
          display: 'inline-block',
        }}
      >{num}</span>

      <button
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); adjust(1) }}
        onTouchStart={e => e.preventDefault()}
        tabIndex={-1}
        className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold active:opacity-50"
        style={btnStyle}
        aria-label="increase"
      >+</button>
    </div>
  )
}

// ── Tournament winner picker ──────────────────────────────────────────────────
function TournamentWinnerPicker({
  teams, selectedTeamId, locked, saving, onPick, onClear,
}: {
  teams: Team[]
  selectedTeamId: number | null
  locked: boolean
  saving: boolean
  onPick: (id: number) => void
  onClear: () => void
}) {
  const selected = teams.find(t => t.id === selectedTeamId)
  const groups = [...new Set(teams.map(t => t.group_letter))].sort()

  return (
    <div className="rounded-2xl mb-6 overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            🏆 Tournament Winner
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
            {locked ? 'Locked — picks are final' : `+25 bonus pts · locks at kickoff`}
          </p>
        </div>
        {selected && (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
            {selected.flag_code && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getFlagUrl(selected.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
            )}
            {selected.name}
            {saving && <span className="animate-pulse ml-1">●</span>}
          </div>
        )}
      </div>

      {locked || selected ? (
        <div className="px-4 py-3 text-sm flex items-center justify-between">
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                {selected.flag_code && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFlagUrl(selected.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                )}
                <span style={{ color: 'var(--color-text)' }}>{selected.name}</span>
              </div>
              {!locked && (
                <button onClick={onClear}
                  className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Change</button>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--color-text-dim)' }}>No pick submitted before lock.</span>
          )}
        </div>
      ) : (
        <div className="px-3 py-3 space-y-3 max-h-64 overflow-y-auto">
          {groups.map(letter => (
            <div key={letter}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-1"
                style={{ color: 'var(--color-text-dim)' }}>Group {letter}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {teams.filter(t => t.group_letter === letter).map(team => {
                  const active = team.id === selectedTeamId
                  return (
                    <button
                      key={team.id}
                      onClick={() => onPick(team.id)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left"
                      style={{
                        background: active ? 'rgba(239,67,35,0.15)' : 'var(--color-surface-2)',
                        border: active ? '1px solid rgba(239,67,35,0.5)' : '1px solid transparent',
                        color: active ? 'var(--color-gold)' : 'var(--color-text)',
                      }}
                    >
                      {team.flag_code && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getFlagUrl(team.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                      )}
                      <span className="truncate">{team.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
