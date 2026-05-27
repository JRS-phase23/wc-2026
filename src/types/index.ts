export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'

export interface Profile {
  id: string
  email: string
  team_name: string
  icon_key: string
  icon_url: string | null
  created_at: string
}

export interface Team {
  id: number
  name: string
  group_letter: string
  group_position: number
  flag_code: string | null
}

export interface Match {
  id: number
  match_number: number
  stage: Stage
  home_label: string
  away_label: string
  home_team_id: number | null
  away_team_id: number | null
  home_team?: Team | null
  away_team?: Team | null
  kickoff_at: string
  venue: string
  home_score: number | null
  away_score: number | null
  extra_time: boolean
  penalties: boolean
  penalty_home: number | null
  penalty_away: number | null
  status: 'scheduled' | 'live' | 'completed'
}

export interface Competition {
  id: string
  name: string
  join_code: string
  admin_id: string
  created_at: string
}

export interface CompetitionMember {
  competition_id: string
  user_id: string
  joined_at: string
  profile?: Profile
  profiles?: { team_name: string; email?: string } | { team_name: string; email?: string }[] | null
}

export interface Pick {
  id: string
  user_id: string
  competition_id: string
  match_id: number
  home_score_pick: number
  away_score_pick: number
  advancing_team_id: number | null
  submitted_at: string
  updated_at: string
}

export interface ScoredPick extends Pick {
  points: number
  breakdown: {
    result: number      // 5 pts
    goal_diff: number   // 5 pts
    exact: number       // 10 pts
    approx: number      // 3 pts
    knockout: number    // 10 pts
  }
}

export interface LeaderboardEntry {
  user_id: string
  team_name: string
  total_points: number
  rank: number
  stage_points: Record<Stage, number>
  accuracy: {
    total_picks: number
    correct_result: number
    exact_score: number
  }
}

export interface PickWithMatch extends Pick {
  match: Match
  scored?: ScoredPick
}

export interface StageSubmission {
  competition_id: string
  user_id: string
  stage: Stage
  submitted_at: string
}

// World Cup standings types
export interface GroupStanding {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}

export interface GroupData {
  letter: string
  standings: GroupStanding[]
  matches: Match[]  // completed matches for H2H matrix
}
