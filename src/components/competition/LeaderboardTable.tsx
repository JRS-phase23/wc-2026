import { cn } from '@/lib/utils'
import { ordinal } from '@/lib/utils'

interface Entry {
  user_id: string
  team_name: string
  total_points: number
  rank: number
  accuracy: { total_picks: number; correct_result: number; exact_score: number }
}

interface Props {
  entries: Entry[]
  currentUserId: string
}

const RANK_COLORS: Record<number, string> = {
  1: '#EF4323',
  2: '#C0C0C0',
  3: '#CD7F32',
}

export default function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10" style={{ color: 'var(--color-text-dim)' }}>
        No players yet
      </div>
    )
  }

  return (
    <div className="space-y-2 stagger">
      {entries.map(entry => {
        const isMe = entry.user_id === currentUserId
        const rankColor = RANK_COLORS[entry.rank]
        const accuracy = entry.accuracy.total_picks > 0
          ? Math.round((entry.accuracy.correct_result / entry.accuracy.total_picks) * 100)
          : null

        return (
          <div
            key={entry.user_id}
            className={cn('flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all')}
            style={{
              background: isMe ? 'rgba(239,67,35,0.08)' : 'var(--color-surface)',
              border: isMe ? '1px solid rgba(239,67,35,0.3)' : '1px solid var(--color-border)',
            }}
          >
            {/* Rank */}
            <div className="w-7 text-center flex-shrink-0">
              <span
                className="text-sm font-bold"
                style={{ color: rankColor ?? 'var(--color-text-dim)' }}
              >
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
              </span>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: isMe ? 'var(--color-gold)' : 'var(--color-text)' }}>
                {entry.team_name} {isMe && <span className="text-xs font-normal opacity-60">(you)</span>}
              </p>
              {accuracy !== null && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                  {accuracy}% result accuracy · {entry.accuracy.exact_score} exact
                </p>
              )}
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-bold" style={{ color: isMe ? 'var(--color-gold)' : 'var(--color-text)' }}>
                {entry.total_points}
              </span>
              <span className="text-xs ml-1" style={{ color: 'var(--color-text-dim)' }}>pts</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
