import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKickoff(date: string): string {
  return format(new Date(date), 'EEE, MMM d · h:mm a')
}

export function formatCountdown(date: string): string {
  if (isPast(new Date(date))) return 'Locked'
  return `Locks ${formatDistanceToNow(new Date(date), { addSuffix: true })}`
}

export function isLocked(kickoffAt: string): boolean {
  return isPast(new Date(kickoffAt))
}

export function getStageFirstKickoff(matches: { kickoff_at: string; stage: string }[], stage: string): string | null {
  const stagematches = matches.filter(m => m.stage === stage)
  if (!stagematches.length) return null
  return stagematches.reduce((min, m) =>
    m.kickoff_at < min ? m.kickoff_at : min, stagematches[0].kickoff_at
  )
}

export function isStageLocked(matches: { kickoff_at: string; stage: string }[], stage: string): boolean {
  const firstKickoff = getStageFirstKickoff(matches, stage)
  if (!firstKickoff) return false
  return isPast(new Date(firstKickoff))
}

export function getFlagUrl(code: string | null): string {
  if (!code) return ''
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getResultLabel(home: number, away: number): string {
  if (home > away) return 'W'
  if (home < away) return 'L'
  return 'D'
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
