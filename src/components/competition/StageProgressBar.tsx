import { STAGE_LABELS, STAGE_ORDER } from '@/lib/scoring'
import type { Stage } from '@/types'

interface Props {
  completedByStage: Record<string, { done: number; total: number }>
}

export default function StageProgressBar({ completedByStage }: Props) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
        Tournament progress
      </p>
      <div className="space-y-2.5">
        {STAGE_ORDER.map(stage => {
          const { done, total } = completedByStage[stage] ?? { done: 0, total: 0 }
          if (total === 0) return null
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const complete = done === total
          const started = done > 0

          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: complete ? 'var(--color-text)' : started ? 'var(--color-gold)' : 'var(--color-text-dim)' }}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  {done}/{total}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: complete ? 'var(--color-green-score)' : 'var(--color-gold)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
