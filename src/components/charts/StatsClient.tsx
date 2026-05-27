'use client'

import { useState } from 'react'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import type { Stage } from '@/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

interface PlayerData {
  user_id: string
  team_name: string
  total_points: number
  timeline: { match_number: number; stage: string; cumulative: number }[]
  stageBreakdown: Record<string, number>
  accuracy: { total: number; correctResult: number; exactScore: number }
}

interface Props {
  competitionName: string
  playerData: PlayerData[]
  currentUserId: string
  completedMatchCount: number
}

const CHART_COLORS = [
  '#F5C518', '#60A5FA', '#34D399', '#F87171', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#F472B6', '#FACC15',
]

export default function StatsClient({ competitionName, playerData, currentUserId, completedMatchCount }: Props) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'stages' | 'accuracy'>('timeline')

  if (completedMatchCount === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Stats</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>{competitionName}</p>
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📊</div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>No stats yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>Stats appear once matches are completed</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Stats</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-dim)' }}>{competitionName}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['timeline', 'stages', 'accuracy'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize"
            style={{
              background: activeTab === tab ? 'rgba(245,197,24,0.15)' : 'var(--color-surface)',
              border: activeTab === tab ? '1px solid rgba(245,197,24,0.4)' : '1px solid var(--color-border)',
              color: activeTab === tab ? 'var(--color-gold)' : 'var(--color-text-dim)',
            }}
          >
            {tab === 'timeline' ? 'Over time' : tab === 'stages' ? 'By stage' : 'Accuracy'}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' && <TimelineChart playerData={playerData} currentUserId={currentUserId} />}
      {activeTab === 'stages' && <StageBreakdownChart playerData={playerData} currentUserId={currentUserId} />}
      {activeTab === 'accuracy' && <AccuracyChart playerData={playerData} currentUserId={currentUserId} />}
    </div>
  )
}

// ── Timeline chart ─────────────────────────────────────────────────────────
function TimelineChart({ playerData, currentUserId }: { playerData: PlayerData[]; currentUserId: string }) {
  if (playerData.length === 0 || playerData[0].timeline.length === 0) return <EmptyChart />

  // Build unified timeline data
  const matchNumbers = playerData[0].timeline.map(t => t.match_number)
  const data = matchNumbers.map(mn => {
    const point: Record<string, number | string> = { match: `M${mn}` }
    for (const p of playerData) {
      const t = p.timeline.find(t => t.match_number === mn)
      if (t) point[p.team_name] = t.cumulative
    }
    return point
  })

  return (
    <div>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Cumulative points over time</p>
      <div className="w-full" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="match" tick={{ fontSize: 10, fill: '#8888AA' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8888AA' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1A1A24', border: '1px solid #2A2A3A', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#8888AA' }}
              itemStyle={{ color: '#F0F0F8' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            {playerData.map((p, i) => (
              <Line
                key={p.user_id}
                type="monotone"
                dataKey={p.team_name}
                stroke={p.user_id === currentUserId ? '#F5C518' : CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={p.user_id === currentUserId ? 3 : 1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Stage breakdown chart ──────────────────────────────────────────────────
function StageBreakdownChart({ playerData, currentUserId }: { playerData: PlayerData[]; currentUserId: string }) {
  const activeStages = STAGE_ORDER.filter(s => playerData.some(p => (p.stageBreakdown[s] ?? 0) > 0))
  if (activeStages.length === 0) return <EmptyChart />

  const data = playerData.map((p, i) => ({
    name: p.team_name.length > 12 ? p.team_name.slice(0, 12) + '…' : p.team_name,
    ...Object.fromEntries(activeStages.map(s => [STAGE_LABELS[s], p.stageBreakdown[s] ?? 0])),
    isMe: p.user_id === currentUserId,
  }))

  const stageColors = ['#F5C518', '#60A5FA', '#34D399', '#F87171', '#A78BFA', '#FB923C', '#38BDF8']

  return (
    <div>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Points by stage</p>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8888AA' }} tickLine={false} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: '#8888AA' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1A1A24', border: '1px solid #2A2A3A', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#8888AA' }}
              itemStyle={{ color: '#F0F0F8' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {activeStages.map((s, i) => (
              <Bar key={s} dataKey={STAGE_LABELS[s]} stackId="a" fill={stageColors[i % stageColors.length]} radius={i === activeStages.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Accuracy chart ─────────────────────────────────────────────────────────
function AccuracyChart({ playerData, currentUserId }: { playerData: PlayerData[]; currentUserId: string }) {
  const withPicks = playerData.filter(p => p.accuracy.total > 0)
  if (withPicks.length === 0) return <EmptyChart />

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Prediction accuracy</p>
      {withPicks.map((p, i) => {
        const resultPct = p.accuracy.total > 0 ? Math.round((p.accuracy.correctResult / p.accuracy.total) * 100) : 0
        const exactPct = p.accuracy.total > 0 ? Math.round((p.accuracy.exactScore / p.accuracy.total) * 100) : 0
        const isMe = p.user_id === currentUserId

        return (
          <div
            key={p.user_id}
            className="p-4 rounded-2xl"
            style={{
              background: isMe ? 'rgba(245,197,24,0.06)' : 'var(--color-surface)',
              border: isMe ? '1px solid rgba(245,197,24,0.25)' : '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: isMe ? 'var(--color-gold)' : 'var(--color-text)' }}>
                {p.team_name} {isMe && '(you)'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{p.accuracy.total} graded picks</span>
            </div>
            <div className="space-y-2">
              <AccuracyBar label="Correct result" pct={resultPct} color="var(--color-gold)" />
              <AccuracyBar label="Exact score" pct={exactPct} color="var(--color-green-score)" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AccuracyBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="text-center py-12" style={{ color: 'var(--color-text-dim)' }}>
      No data yet — check back when matches are completed.
    </div>
  )
}
