import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Users, Trophy } from 'lucide-react'
import CreateCompetitionButton from '@/components/competition/CreateCompetitionButton'
import JoinCompetitionButton from '@/components/competition/JoinCompetitionButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_name')
    .eq('id', user.id)
    .single()

  // Fetch competitions user is in (either as admin or member)
  const { data: adminComps } = await supabase
    .from('competitions')
    .select('id, name, join_code, created_at')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false })

  const { data: memberComps } = await supabase
    .from('competition_members')
    .select('competition_id, competitions(id, name, join_code, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const adminIds = new Set((adminComps ?? []).map(c => c.id))
  const allComps = [
    ...(adminComps ?? []).map(c => ({ ...c, isAdmin: true })),
    ...(memberComps ?? [])
      .map(m => {
        const c = (Array.isArray(m.competitions) ? m.competitions[0] : m.competitions) as { id: string; name: string; join_code: string; created_at: string } | null
        return c ? { ...c, isAdmin: false } : null
      })
      .filter((c): c is { id: string; name: string; join_code: string; created_at: string; isAdmin: boolean } => !!c)
      .filter(c => c && !adminIds.has(c.id)),
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Greeting */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {profile?.team_name ?? 'My Team'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-dim)' }}>Choose a competition or start a new one</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <CreateCompetitionButton userId={user.id} />
        <JoinCompetitionButton userId={user.id} />
      </div>

      {/* Competition list */}
      {allComps.length === 0 ? (
        <div className="text-center py-16 stagger">
          <div className="text-4xl mb-4">🏆</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No competitions yet</p>
          <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Create one or join with a code</p>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-dim)' }}>
            Your competitions
          </p>
          {allComps.map((comp) => (
            <Link
              key={comp.id}
              href={`/competition/${comp.id}`}
              className="flex items-center justify-between p-4 rounded-2xl transition-all hover:border-white/10 active:scale-[0.99]"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: comp.isAdmin ? 'rgba(239,67,35,0.15)' : 'rgba(255,255,255,0.05)' }}>
                  {comp.isAdmin ? <Trophy size={18} style={{ color: 'var(--color-gold)' }} /> : <Users size={18} style={{ color: 'var(--color-text-dim)' }} />}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{comp.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                    {comp.isAdmin ? 'Admin · ' : ''}Code: <span className="font-mono">{comp.join_code}</span>
                  </p>
                </div>
              </div>
              <span style={{ color: 'var(--color-text-dim)' }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
