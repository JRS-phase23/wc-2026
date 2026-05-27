'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function TopBar() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-xl">⚽</span>
        <span className="font-bold text-base" style={{ color: 'var(--color-gold)' }}>WC 2026</span>
      </Link>

      <button
        onClick={signOut}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: 'var(--color-text-dim)' }}
      >
        <LogOut size={15} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  )
}
