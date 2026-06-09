'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [next] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') ?? '/dashboard' : '/dashboard')
  const isJoining = next.startsWith('/join/')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { team_name: teamName.trim() } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  return (
    <div className="page-bloom-alt min-h-dvh flex flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="mb-10">
          <Link href="/">
            <Image src="/phase23-logo.svg" alt="Phase23" width={148} height={11} style={{ height: 'auto' }} priority />
          </Link>
        </div>

        {/* Polestar-style heading */}
        <div className="mb-10">
          <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Create</h1>
          <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Your team</h1>
          <p className="text-sm mt-5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
            Free to join · No credit card required.
          </p>
          {isJoining && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,67,35,0.1)', border: '1px solid rgba(239,67,35,0.2)', color: 'var(--color-gold)' }}>
              🏆 You&apos;ll be joined to the game automatically after sign up.
            </div>
          )}
        </div>

        {/* Thin divider */}
        <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>
              Team name <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--color-text-dim)', opacity: 0.6 }}>(your identity in competitions)</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              maxLength={30}
              placeholder="e.g. Golden Boot Hunters"
              className="w-full px-0 py-3 text-sm outline-none bg-transparent border-b transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-0 py-3 text-sm outline-none bg-transparent border-b transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="pb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full px-0 py-3 text-sm outline-none bg-transparent border-b transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(229,57,53,0.1)', color: '#ef5350', border: '1px solid rgba(229,57,53,0.2)' }}>
              {error}
            </div>
          )}

          {/* Polestar-style primary button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-between px-5 py-4 font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-40"
              style={{ background: '#fff', color: '#000', borderRadius: 3 }}
            >
              <span>{loading ? 'Creating account…' : 'Create team'}</span>
              {!loading && <span style={{ color: 'var(--color-gold)' }}>→</span>}
            </button>

            {/* Ghost CTA */}
            <Link
              href={next !== '/dashboard' ? `/login?next=${encodeURIComponent(next)}` : '/login'}
              className="mt-3 w-full flex items-center justify-between px-5 py-3.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-dim)' }}
            >
              <span>Already have an account? Sign in</span>
              <span style={{ color: 'var(--color-gold)' }}>→</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
