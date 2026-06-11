'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import { formatKickoff, getFlagUrl } from '@/lib/utils'
import type { Match, CompetitionMember, Stage } from '@/types'
import { Check, Trash2, Users, ClipboardList, Pencil, AlertTriangle } from 'lucide-react'
import CopyCodeButton from './CopyCodeButton'

interface Props {
  competitionId: string
  competitionName: string
  joinCode: string
  adminId: string
  matches: Match[]
  members: CompetitionMember[]
}

export default function AdminClient({ competitionId, competitionName, joinCode, adminId, matches, members }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'results' | 'members'>('results')
  const [name, setName] = useState(competitionName)
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveName() {
    if (!name.trim() || name.trim() === competitionName) { setEditingName(false); return }
    setSavingName(true)
    const supabase = createClient()
    await supabase.from('competitions').update({ name: name.trim() }).eq('id', competitionId)
    setSavingName(false)
    setEditingName(false)
    router.refresh()
  }

  async function deleteGame() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('picks').delete().eq('competition_id', competitionId)
    await supabase.from('competition_members').delete().eq('competition_id', competitionId)
    await supabase.from('competitions').delete().eq('id', competitionId)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-5 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Admin Panel</h1>

        {/* Editable game name */}
        <div className="flex items-center gap-2 mt-1">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(competitionName); setEditingName(false) } }}
                maxLength={50}
                className="flex-1 text-sm px-2 py-1 rounded-lg outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button onClick={saveName} disabled={savingName} className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--color-gold)', color: '#fff' }}>
                {savingName ? '…' : 'Save'}
              </button>
              <button onClick={() => { setName(competitionName); setEditingName(false) }} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
              {name}
              <button onClick={() => setEditingName(true)} className="hover:opacity-70 transition-opacity">
                <Pencil size={12} style={{ color: 'var(--color-text-dim)' }} />
              </button>
              · <CopyCodeButton code={joinCode} />
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['results', 'members'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'rgba(239,67,35,0.15)' : 'var(--color-surface)',
              border: tab === t ? '1px solid rgba(239,67,35,0.4)' : '1px solid var(--color-border)',
              color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
            }}
          >
            {t === 'results' ? <><ClipboardList size={14} />Enter Results</> : <><Users size={14} />Players</>}
          </button>
        ))}
      </div>

      {tab === 'results' && <ResultsTab matches={matches} />}
      {tab === 'members' && <MembersTab competitionId={competitionId} adminId={adminId} members={members} />}

      {/* Delete game */}
      <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-colors hover:bg-red-500/10"
            style={{ color: '#ef5350', border: '1px solid rgba(239,83,80,0.2)' }}
          >
            <Trash2 size={14} />
            Delete game
          </button>
        ) : (
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)' }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={16} style={{ color: '#ef5350', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Delete "{name}"?</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>
                  This permanently removes the game, all picks, and all members. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
                Cancel
              </button>
              <button onClick={deleteGame} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: '#ef5350', color: '#fff' }}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Results entry tab ─────────────────────────────────────────────────────
function ResultsTab({ matches }: { matches: Match[] }) {
  const [activeStage, setActiveStage] = useState<Stage>(() => {
    for (const s of STAGE_ORDER) {
      const stageMatches = matches.filter(m => m.stage === s)
      if (stageMatches.some(m => m.status !== 'completed')) return s
    }
    return 'group'
  })

  const stageMatches = matches.filter(m => m.stage === activeStage)

  return (
    <div>
      {/* Stage selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {STAGE_ORDER.map(stage => {
          const count = matches.filter(m => m.stage === stage).length
          if (!count) return null
          const done = matches.filter(m => m.stage === stage && m.status === 'completed').length
          return (
            <button key={stage} onClick={() => setActiveStage(stage)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeStage === stage ? 'rgba(239,67,35,0.15)' : 'var(--color-surface)',
                border: activeStage === stage ? '1px solid rgba(239,67,35,0.4)' : '1px solid var(--color-border)',
                color: activeStage === stage ? 'var(--color-gold)' : 'var(--color-text-dim)',
              }}>
              {STAGE_LABELS[stage]} {done}/{count}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {stageMatches.map(match => (
          <ResultEntryCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}

function ResultEntryCard({ match }: { match: Match }) {
  const alreadySaved = match.status === 'completed'
  const [homeScore, setHomeScore] = useState(match.home_score ?? 0)
  const [awayScore, setAwayScore] = useState(match.away_score ?? 0)
  const [extraTime, setExtraTime] = useState(match.extra_time)
  const [penalties, setPenalties] = useState(match.penalties)
  const [penHome, setPenHome] = useState(match.penalty_home ?? 0)
  const [penAway, setPenAway] = useState(match.penalty_away ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(alreadySaved)
  // Track whether admin has touched the steppers — prevents accidental 0-0 saves
  const [touched, setTouched] = useState(alreadySaved)
  const [error, setError] = useState('')
  const router = useRouter()

  const homeTeam = match.home_team
  const awayTeam = match.away_team

  function touch<T>(setter: (v: T) => void): (v: T) => void {
    return (v: T) => { setter(v); setTouched(true); setSaved(false) }
  }

  async function save() {
    if (!touched) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    const update: Record<string, unknown> = {
      home_score: homeScore,
      away_score: awayScore,
      extra_time: extraTime,
      penalties,
      status: 'completed',
    }
    if (penalties) {
      update.penalty_home = penHome
      update.penalty_away = penAway
    }

    const { error: err } = await supabase.from('matches').update(update).eq('id', match.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    router.refresh()
  }

  async function clearResult() {
    const supabase = createClient()
    await supabase.from('matches').update({ home_score: null, away_score: null, status: 'scheduled', extra_time: false, penalties: false, penalty_home: null, penalty_away: null }).eq('id', match.id)
    setHomeScore(0); setAwayScore(0); setExtraTime(false); setPenalties(false); setPenHome(0); setPenAway(0)
    setTouched(false); setSaved(false)
    router.refresh()
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: `1px solid ${saved ? 'rgba(0,135,90,0.3)' : 'var(--color-border)'}` }}>
      {/* Teams */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>#{match.match_number}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{formatKickoff(match.kickoff_at)}</span>
        {saved && <span className="ml-auto text-xs flex items-center gap-1" style={{ color: 'var(--color-green-score)' }}><Check size={11} />Done</span>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {homeTeam?.flag_code && <img src={getFlagUrl(homeTeam.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />}
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{homeTeam?.name ?? match.home_label}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <ScoreStep value={homeScore} onChange={touch(setHomeScore)} />
          <span className="text-sm px-0.5" style={{ color: 'var(--color-text-dim)' }}>–</span>
          <ScoreStep value={awayScore} onChange={touch(setAwayScore)} />
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--color-text)' }}>{awayTeam?.name ?? match.away_label}</span>
          {awayTeam?.flag_code && <img src={getFlagUrl(awayTeam.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />}
        </div>
      </div>

      {/* Knockout extras */}
      {match.stage !== 'group' && (
        <div className="mt-3 pt-3 flex items-center gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-dim)' }}>
            <input type="checkbox" checked={extraTime} onChange={e => { setExtraTime(e.target.checked); setTouched(true) }} className="rounded" />
            Extra time
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-dim)' }}>
            <input type="checkbox" checked={penalties} onChange={e => { setPenalties(e.target.checked); setTouched(true) }} className="rounded" />
            Penalties
          </label>
          {penalties && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Pen:</span>
              <ScoreStep value={penHome} onChange={touch(setPenHome)} size="small" />
              <span className="text-xs px-0.5" style={{ color: 'var(--color-text-dim)' }}>–</span>
              <ScoreStep value={penAway} onChange={touch(setPenAway)} size="small" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        {error && <span className="text-xs" style={{ color: '#ef5350' }}>{error}</span>}
        {saved && (
          <button onClick={clearResult} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
            Clear
          </button>
        )}
        <button
          onClick={save}
          disabled={saving || !touched}
          className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
          style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}
        >
          {saving ? 'Saving…' : saved ? 'Update' : 'Save result'}
        </button>
      </div>
    </div>
  )
}

// ── Members management tab ────────────────────────────────────────────────
function MembersTab({ competitionId, adminId, members }: { competitionId: string; adminId: string; members: CompetitionMember[] }) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null)

  async function removeMember(userId: string) {
    if (userId === adminId) return
    setRemoving(userId)
    setConfirmUserId(null)
    const supabase = createClient()
    await supabase.from('competition_members')
      .delete()
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
    setRemoving(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
        {members.length} player{members.length !== 1 ? 's' : ''}
      </p>
      {members.map(m => {
        const profile = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { team_name: string; email: string } | null
        const isAdmin = m.user_id === adminId
        const isConfirming = confirmUserId === m.user_id
        return (
          <div key={m.user_id} className="px-4 py-3 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: `1px solid ${isConfirming ? 'rgba(239,83,80,0.3)' : 'var(--color-border)'}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {profile?.team_name ?? 'Unknown'} {isAdmin && <span className="text-xs" style={{ color: 'var(--color-gold)' }}>· Admin</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>{profile?.email}</p>
              </div>
              {!isAdmin && !isConfirming && (
                <button
                  onClick={() => setConfirmUserId(m.user_id)}
                  disabled={removing === m.user_id}
                  className="p-2 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                  style={{ color: '#ef5350' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            {isConfirming && (
              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(239,83,80,0.2)' }}>
                <span className="text-xs" style={{ color: '#ef5350' }}>Remove this player?</span>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmUserId(null)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
                    Cancel
                  </button>
                  <button onClick={() => removeMember(m.user_id)} disabled={removing === m.user_id}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                    style={{ background: '#ef5350', color: '#fff' }}>
                    {removing === m.user_id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Score stepper — no input field, no iOS scroll-jump ────────────────────
function ScoreStep({ value, onChange, size = 'normal' }: {
  value: number
  onChange: (n: number) => void
  size?: 'normal' | 'small'
}) {
  const isSmall = size === 'small'
  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface-3)',
    color: 'var(--color-text-dim)',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }
  return (
    <div className="flex items-center gap-0.5" style={{ touchAction: 'manipulation' }}>
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onChange(Math.max(0, value - 1)) }}
        onTouchStart={e => e.preventDefault()}
        tabIndex={-1}
        className={`${isSmall ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg'} rounded-full flex items-center justify-center font-bold active:opacity-50`}
        style={btnStyle}
        aria-label="decrease"
      >−</button>
      <span
        className="font-bold text-center"
        style={{
          minWidth: isSmall ? '1.25rem' : '1.5rem',
          fontSize: isSmall ? 13 : 16,
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
          display: 'inline-block',
        }}
      >{value}</span>
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onChange(Math.min(99, value + 1)) }}
        onTouchStart={e => e.preventDefault()}
        tabIndex={-1}
        className={`${isSmall ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg'} rounded-full flex items-center justify-center font-bold active:opacity-50`}
        style={btnStyle}
        aria-label="increase"
      >+</button>
    </div>
  )
}
