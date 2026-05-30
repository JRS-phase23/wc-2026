'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [next] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') ?? '/dashboard' : '/dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 mb-5">
            <Image src="/phase23-logo.svg" alt="Phase23" width={120} height={14} style={{ height: 'auto' }} priority />
            <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-text-dim)' }}>
              World Cup Pick&apos;em
            </span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors focus:ring-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors focus:ring-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(229,57,53,0.12)', color: '#ef5350', border: '1px solid rgba(229,57,53,0.25)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--color-gold)', color: '#fff' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-dim)' }}>
          No account?{' '}
          <Link href="/signup" className="font-semibold" style={{ color: 'var(--color-gold)' }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
