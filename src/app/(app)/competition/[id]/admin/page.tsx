import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from '@/components/competition/AdminClient'
import type { Match, CompetitionMember } from '@/types'

export default async function AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comp } = await supabase
    .from('competitions')
    .select('id, name, join_code, admin_id')
    .eq('id', id)
    .single()
  if (!comp) notFound()
  if (comp.admin_id !== user.id) redirect(`/competition/${id}`)

  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code), away_team:teams!matches_away_team_id_fkey(id,name,flag_code)')
    .order('match_number')

  const { data: members } = await supabase
    .from('competition_members')
    .select('competition_id, user_id, joined_at, profiles(team_name, email)')
    .eq('competition_id', id)

  return (
    <AdminClient
      competitionId={id}
      competitionName={comp.name}
      joinCode={comp.join_code}
      adminId={user.id}
      matches={(matches ?? []) as Match[]}
      members={(members ?? []) as unknown as CompetitionMember[]}
    />
  )
}
