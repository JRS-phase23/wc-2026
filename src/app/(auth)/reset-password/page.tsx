'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [ready, setReady] = useState(false)    // recovery session established
  const [waiting, setWaiting] = useState(true) // still listening for auth event
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Timer declared in outer scope so both branches can clear it
    let timer: ReturnType<typeof setTimeout>

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY = coming fresh from the reset link
      // SIGNED_IN / INITIAL_SESSION = page was refreshed after code exchange
      if (session && (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION'
      )) {
        clearTimeout(timer)
        setReady(true)
        setWaiting(false)
      }
    })

    // Handle page-refresh case: session already exists in localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timer)
        setReady(true)
        setWaiting(false)
      }
    })

    // After 5 seconds with no auth event → show expired-link error
    timer = setTimeout(() => setWaiting(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer) // always cancel the timer on unmount
    }
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
    <div className="page-bloom-alt min-h-dvh flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="mb-10">
          <Link href="/">
            <Image src="/phase23-logo.svg" alt="Phase23" width={148} height={11} style={{ height: 'auto' }} priority />
          </Link>
        </div>

        {/* Waiting for auth event */}
        {waiting && (
          <div className="flex flex-col items-start gap-4 py-4">
            <div className="mb-6">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Verifying</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Link…</h1>
            </div>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-dim)' }} />
          </div>
        )}

        {/* Success */}
        {!waiting && done && (
          <>
            <div className="mb-10">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Password</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Updated</h1>
            </div>
            <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />
            <div className="flex items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,135,90,0.15)', border: '1px solid rgba(0,135,90,0.3)' }}>
                <Check size={16} style={{ color: 'var(--color-green-score)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                Redirecting to your dashboard…
              </p>
            </div>
          </>
        )}

        {/* Expired / no session */}
        {!waiting && !ready && !done && (
          <>
            <div className="mb-10">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Link</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-red-score)' }}>Expired</h1>
              <p className="text-sm mt-5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                This reset link has already been used or has expired.
              </p>
            </div>

            <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />

            <div className="pt-2">
              <Link
                href="/forgot-password"
                className="w-full flex items-center justify-between px-5 py-4 font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: '#fff', color: '#000', borderRadius: 3 }}
              >
                <span>Request a new link</span>
                <span style={{ color: 'var(--color-gold)' }}>→</span>
              </Link>
              <Link href="/login"
                className="mt-3 w-full flex items-center justify-between px-5 py-3.5 text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-text-dim)' }}>
                <span>Back to sign in</span>
                <span style={{ color: 'var(--color-gold)' }}>→</span>
              </Link>
            </div>
          </>
        )}

        {/* Password form */}
        {!waiting && ready && !done && (
          <>
            <div className="mb-10">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>New</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Password</h1>
              <p className="text-sm mt-5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                Choose a new password for your account.
              </p>
            </div>

            <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-dim)' }}>
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
                  className="w-full px-0 py-3 outline-none bg-transparent border-b transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="pb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-dim)' }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  className="w-full px-0 py-3 outline-none bg-transparent border-b transition-colors"
                  style={{
                    borderColor: confirm && confirm !== password ? 'rgba(248,113,113,0.6)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-red-score)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-between px-5 py-4 font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-40"
                  style={{ background: '#fff', color: '#000', borderRadius: 3 }}
                >
                  <span>{loading ? 'Updating…' : 'Set new password'}</span>
                  {!loading && <span style={{ color: 'var(--color-gold)' }}>→</span>}
                </button>

                <Link href="/login"
                  className="mt-3 w-full flex items-center justify-between px-5 py-3.5 text-sm transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-text-dim)' }}>
                  <span>Back to sign in</span>
                  <span style={{ color: 'var(--color-gold)' }}>→</span>
                </Link>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
