'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Check } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [ready, setReady] = useState(false)       // session is established
  const [waiting, setWaiting] = useState(true)    // still listening for auth event
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires PASSWORD_RECOVERY when Supabase processes
    // the recovery token — works for both PKCE (?code=) and implicit (#access_token=)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true)
        setWaiting(false)
      }
    })

    // Also check if we already have a recovery session (page refresh case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
        setWaiting(false)
      } else {
        // Give the auth state change listener 4 seconds to fire before showing error
        const timer = setTimeout(() => setWaiting(false), 4000)
        return () => clearTimeout(timer)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 mb-5">
            <Image src="/phase23-logo.svg" alt="Phase23" width={120} height={14} style={{ height: 'auto' }} priority />
            <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-text-dim)' }}>
              World Cup Pick&apos;em
            </span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {done ? 'Password updated!' : 'Choose a new password'}
          </h1>
        </div>

        {/* Waiting for auth event */}
        {waiting && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Verifying reset link…</p>
          </div>
        )}

        {/* Success */}
        {!waiting && done && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,135,90,0.15)', border: '1px solid rgba(0,135,90,0.3)' }}>
              <Check size={26} style={{ color: 'var(--color-green-score)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
              Redirecting you to your dashboard…
            </p>
          </div>
        )}

        {/* Link expired / no session */}
        {!waiting && !ready && !done && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-red-score)', border: '1px solid rgba(248,113,113,0.25)' }}>
              This reset link has expired or already been used.
            </div>
            <Link
              href="/forgot-password"
              className="flex items-center justify-center w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'var(--color-gold)', color: '#fff' }}>
              Request a new link
            </Link>
            <p className="text-center text-sm">
              <Link href="/login" style={{ color: 'var(--color-text-dim)' }}>Back to sign in</Link>
            </p>
          </div>
        )}

        {/* Password form */}
        {!waiting && ready && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${confirm && confirm !== password ? 'rgba(248,113,113,0.5)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-red-score)', border: '1px solid rgba(248,113,113,0.25)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--color-gold)', color: '#fff' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {loading ? 'Updating…' : 'Set new password'}
            </button>

            <p className="text-center text-sm">
              <Link href="/login" style={{ color: 'var(--color-text-dim)' }}>Back to sign in</Link>
            </p>
          </form>
        )}

      </div>
    </div>
  )
}
