'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Trophy, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Soccer ball icon as SVG (no lucide equivalent)
function SoccerBallIcon({ size = 20, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0-6.88 17.25L12 12l6.88 7.25A10 10 0 0 0 12 2z" strokeWidth={strokeWidth * 0.7} />
      <path d="M12 12l-6.88 7.25M12 12l6.88 7.25M12 2v10" strokeWidth={strokeWidth * 0.7} />
    </svg>
  )
}

export default function BottomNav() {
  const pathname = usePathname()

  const competitionMatch = pathname.match(/\/competition\/([^/]+)/)
  const competitionId = competitionMatch?.[1]

  const nav = competitionId
    ? [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home', custom: false },
        { href: `/competition/${competitionId}`, icon: Trophy, label: 'Leaderboard', custom: false },
        { href: `/competition/${competitionId}/stats`, icon: BarChart3, label: 'Stats', custom: false },
        { href: '/world-cup', icon: null, label: 'World Cup', custom: true },
      ]
    : [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home', custom: false },
        { href: '/world-cup', icon: null, label: 'World Cup', custom: true },
      ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: '8px',
      }}
    >
      {nav.map(({ href, icon: Icon, label, custom }) => {
        const active = pathname === href ||
          (href !== '/dashboard' && pathname.startsWith(href) && !pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors text-xs font-medium',
              active ? '' : 'opacity-50'
            )}
            style={{ color: active ? (custom ? '#60A5FA' : 'var(--color-gold)') : 'var(--color-text-dim)' }}
          >
            {custom ? (
              <SoccerBallIcon size={20} strokeWidth={active ? 2.5 : 2} />
            ) : Icon ? (
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            ) : null}
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
