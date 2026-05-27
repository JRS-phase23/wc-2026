import { createClient } from '@/lib/supabase/server'
import { buildGroupStandings } from '@/lib/utils'
import { getFlagUrl } from '@/lib/utils'
import type { Match, GroupData } from '@/types'

export const revalidate = 300 // re-fetch every 5 minutes

export default async function WorldCupPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code,group_letter,group_position), away_team:teams!matches_away_team_id_fkey(id,name,flag_code,group_letter,group_position)')
    .order('match_number')

  const allMatches = (matches ?? []) as Match[]
  const groupsData = buildGroupStandings(allMatches)
  const hasResults = allMatches.some(m => m.status === 'completed')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header — distinct from fantasy theme */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          {/* Official WC badge */}
          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.12)', letterSpacing: '0.12em' }}>
            Official
          </span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0F8' }}>
          FIFA World Cup 2026
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
          Canada · Mexico · United States · June 11 – July 19
        </p>
      </div>

      {/* Pre-tournament notice */}
      {!hasResults && (
        <div className="px-4 py-3 rounded-xl mb-6 text-sm"
          style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)', color: '#94A3B8' }}>
          The tournament begins <strong style={{ color: '#CBD5E1' }}>June 11, 2026</strong>. Group standings will update as matches are played.
        </div>
      )}

      {/* Group standings */}
      <div className="space-y-6">
        {groupsData.map(group => (
          <GroupCard key={group.letter} group={group} />
        ))}
      </div>

      {/* Data source note */}
      <p className="text-xs text-center mt-8" style={{ color: '#475569' }}>
        {process.env.RAPIDAPI_KEY
          ? 'Live data via API-Football · updates every 5 min'
          : 'Data from match results entered by competition admin'}
      </p>
    </div>
  )
}

function GroupCard({ group }: { group: GroupData }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
        Group {group.letter}
      </h2>

      {/* Standings table — slate/neutral palette (not gold) */}
      <div className="rounded-2xl overflow-hidden mb-3"
        style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
        {/* Header */}
        <div className="grid text-xs font-semibold uppercase tracking-wide px-3 py-2"
          style={{ gridTemplateColumns: '1fr repeat(7, auto)', gap: '0 12px', color: '#475569', borderBottom: '1px solid #1E293B' }}>
          <span>Team</span>
          <span className="text-right">P</span>
          <span className="text-right">W</span>
          <span className="text-right">D</span>
          <span className="text-right">L</span>
          <span className="text-right">GF</span>
          <span className="text-right">GD</span>
          <span className="text-right font-bold" style={{ color: '#60A5FA' }}>Pts</span>
        </div>

        {group.standings.length === 0 ? (
          <p className="px-3 py-4 text-xs text-center" style={{ color: '#475569' }}>
            No results yet
          </p>
        ) : group.standings.map((row, i) => (
          <div key={row.team.id}
            className="grid items-center px-3 py-2.5"
            style={{
              gridTemplateColumns: '1fr repeat(7, auto)',
              gap: '0 12px',
              borderTop: i > 0 ? '1px solid #1E293B' : undefined,
              background: i < 2 ? 'rgba(96,165,250,0.04)' : undefined,
            }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: i < 2 ? '#60A5FA' : '#475569' }}>
                {i + 1}
              </span>
              {row.team.flag_code && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getFlagUrl(row.team.flag_code)} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>
                {row.team.name}
              </span>
              {i < 2 && row.played > 0 && (
                <span className="text-xs px-1 rounded" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA', fontSize: 9 }}>Q</span>
              )}
            </div>
            <span className="text-xs text-right" style={{ color: '#94A3B8' }}>{row.played}</span>
            <span className="text-xs text-right" style={{ color: '#94A3B8' }}>{row.won}</span>
            <span className="text-xs text-right" style={{ color: '#94A3B8' }}>{row.drawn}</span>
            <span className="text-xs text-right" style={{ color: '#94A3B8' }}>{row.lost}</span>
            <span className="text-xs text-right" style={{ color: '#94A3B8' }}>{row.goals_for}</span>
            <span className="text-xs text-right" style={{
              color: row.goal_diff > 0 ? '#4ADE80' : row.goal_diff < 0 ? '#F87171' : '#94A3B8'
            }}>
              {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
            </span>
            <span className="text-sm text-right font-bold" style={{ color: '#60A5FA' }}>{row.points}</span>
          </div>
        ))}
      </div>

      {/* Recent results in this group */}
      {group.matches.length > 0 && (
        <div className="space-y-1.5">
          {group.matches.map(m => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {m.home_team?.flag_code && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFlagUrl(m.home_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
                )}
                <span className="truncate" style={{ color: '#E2E8F0' }}>{m.home_team?.name ?? m.home_label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mx-3">
                <span className="font-bold text-base" style={{ color: '#F1F5F9' }}>
                  {m.home_score} – {m.away_score}
                </span>
                {m.penalties && <span className="text-xs" style={{ color: '#94A3B8' }}>PSO</span>}
                {m.extra_time && !m.penalties && <span className="text-xs" style={{ color: '#94A3B8' }}>ET</span>}
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="truncate text-right" style={{ color: '#E2E8F0' }}>{m.away_team?.name ?? m.away_label}</span>
                {m.away_team?.flag_code && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFlagUrl(m.away_team.flag_code)} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
