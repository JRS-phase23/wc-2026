'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import { formatKickoff, getFlagUrl } from '@/lib/utils'
import type { Match, CompetitionMember, Stage } from '@/types'
import { Check, Trash2, Users, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [tab, setTab] = useState<'results' | 'members'>('results')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-5 animate-fade-in">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Admin Panel</h1>
        <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
          {competitionName} · <CopyCodeButton code={joinCode} />
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['results', 'members'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'rgba(245,197,24,0.15)' : 'var(--color-surface)',
              border: tab === t ? '1px solid rgba(245,197,24,0.4)' : '1px solid var(--color-border)',
              color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
            }}
          >
            {t === 'results' ? <><ClipboardList size={14} />Enter Results</> : <><Users size={14} />Players</>}
          </button>
        ))}
      </div>

      {tab === 'results' && <ResultsTab matches={matches} />}
      {tab === 'members' && <MembersTab competitionId={competitionId} adminId={adminId} members={members} />}
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
                background: activeStage === stage ? 'rgba(245,197,24,0.15)' : 'var(--color-surface)',
                border: activeStage === stage ? '1px solid rgba(245,197,24,0.4)' : '1px solid var(--color-border)',
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
  const [homeScore, setHomeScore] = useState(match.home_score != null ? String(match.home_score) : '')
  const [awayScore, setAwayScore] = useState(match.away_score != null ? String(match.away_score) : '')
  const [extraTime, setExtraTime] = useState(match.extra_time)
  const [penalties, setPenalties] = useState(match.penalties)
  const [penHome, setPenHome] = useState(match.penalty_home != null ? String(match.penalty_home) : '')
  const [penAway, setPenAway] = useState(match.penalty_away != null ? String(match.penalty_away) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(match.status === 'completed')
  const [error, setError] = useState('')
  const router = useRouter()

  const homeTeam = match.home_team
  const awayTeam = match.away_team

  async function save() {
    if (homeScore === '' || awayScore === '') return
    setSaving(true)
    setError('')
    const supabase = createClient()

    const update: Record<string, unknown> = {
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      extra_time: extraTime,
      penalties,
      status: 'completed',
    }
    if (penalties) {
      update.penalty_home = penHome ? parseInt(penHome) : null
      update.penalty_away = penAway ? parseInt(penAway) : null
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
    setHomeScore(''); setAwayScore(''); setExtraTime(false); setPenalties(false); setPenHome(''); setPenAway('')
    setSaved(false)
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

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input
            type="number" min={0} max={99} value={homeScore} onChange={e => { setHomeScore(e.target.value); setSaved(false) }}
            placeholder="0"
            className="w-11 text-center text-base font-bold rounded-xl py-2 outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <span style={{ color: 'var(--color-text-dim)' }}>–</span>
          <input
            type="number" min={0} max={99} value={awayScore} onChange={e => { setAwayScore(e.target.value); setSaved(false) }}
            placeholder="0"
            className="w-11 text-center text-base font-bold rounded-xl py-2 outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
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
            <input type="checkbox" checked={extraTime} onChange={e => setExtraTime(e.target.checked)} className="rounded" />
            Extra time
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-dim)' }}>
            <input type="checkbox" checked={penalties} onChange={e => setPenalties(e.target.checked)} className="rounded" />
            Penalties
          </label>
          {penalties && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Pen:</span>
              <input type="number" min={0} max={20} value={penHome} onChange={e => setPenHome(e.target.value)}
                placeholder="0" className="w-9 text-center text-sm rounded-lg py-1 outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              <span style={{ color: 'var(--color-text-dim)' }}>–</span>
              <input type="number" min={0} max={20} value={penAway} onChange={e => setPenAway(e.target.value)}
                placeholder="0" className="w-9 text-center text-sm rounded-lg py-1 outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
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
          disabled={saving || homeScore === '' || awayScore === ''}
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

  async function removeMember(userId: string) {
    if (userId === adminId) return
    setRemoving(userId)
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
        return (
          <div key={m.user_id} className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {profile?.team_name ?? 'Unknown'} {isAdmin && <span className="text-xs" style={{ color: 'var(--color-gold)' }}>· Admin</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>{profile?.email}</p>
            </div>
            {!isAdmin && (
              <button
                onClick={() => removeMember(m.user_id)}
                disabled={removing === m.user_id}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                style={{ color: '#ef5350' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
