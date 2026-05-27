import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STAGE_ORDER } from '@/lib/scoring'
import { isStageLocked } from '@/lib/utils'
import PicksClient from '@/components/competition/PicksClient'
import type { Match, Pick, Stage, StageSubmission } from '@/types'

export default async function PicksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: comp }, { data: profileData }] = await Promise.all([
    supabase.from('competitions').select('id, name').eq('id', id).single(),
    supabase.from('profiles').select('team_name').eq('id', user.id).single(),
  ])
  if (!comp) notFound()

  const teamName = profileData?.team_name ?? 'My Picks'

  // Verify membership
  const { data: membership } = await supabase
    .from('competition_members')
    .select('user_id')
    .eq('competition_id', id)
    .eq('user_id', user.id)
    .single()
  if (!membership) redirect(`/competition/${id}`)

  // Load all matches with teams
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(id,name,flag_code,group_letter,group_position), away_team:teams!matches_away_team_id_fkey(id,name,flag_code,group_letter,group_position)')
    .order('match_number')

  // Load user's picks
  const { data: existingPicks } = await supabase
    .from('picks')
    .select('*')
    .eq('competition_id', id)
    .eq('user_id', user.id)

  // Load stage submissions for this user/competition
  const { data: stageSubmissions } = await supabase
    .from('stage_submissions')
    .select('*')
    .eq('competition_id', id)
    .eq('user_id', user.id)

  const allMatches = (matches ?? []) as Match[]

  const stageLocks: Record<string, boolean> = {}
  for (const stage of STAGE_ORDER) {
    stageLocks[stage] = isStageLocked(allMatches, stage)
  }

  return (
    <PicksClient
      competitionId={id}
      competitionName={comp.name}
      teamName={teamName}
      userId={user.id}
      matches={allMatches}
      existingPicks={(existingPicks ?? []) as Pick[]}
      stageLocks={stageLocks}
      stageSubmissions={(stageSubmissions ?? []) as StageSubmission[]}
    />
  )
}
