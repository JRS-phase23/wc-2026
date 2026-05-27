'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Trophy, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const baseNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Extract competition id if we're inside a competition
  const competitionMatch = pathname.match(/\/competition\/([^/]+)/)
  const competitionId = competitionMatch?.[1]

  const nav = competitionId
    ? [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { href: `/competition/${competitionId}`, icon: Trophy, label: 'Leaderboard' },
        { href: `/competition/${competitionId}/stats`, icon: BarChart3, label: 'Stats' },
      ]
    : baseNav

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 pb-safe"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}
    >
      {nav.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && !pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={cn('flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors text-xs font-medium', active ? '' : 'opacity-50')}
            style={{ color: active ? 'var(--color-gold)' : 'var(--color-text-dim)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
