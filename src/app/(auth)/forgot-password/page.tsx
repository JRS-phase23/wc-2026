'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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

        {!sent ? (
          <>
            {/* Polestar heading */}
            <div className="mb-10">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Reset</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Password</h1>
              <p className="text-sm mt-5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-dim)' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@example.com"
                  className="w-full px-0 py-3 outline-none bg-transparent border-b transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
                  <span>{loading ? 'Sending…' : 'Send reset link'}</span>
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
        ) : (
          <>
            {/* Success state */}
            <div className="mb-10">
              <h1 className="text-5xl font-light leading-none mb-1" style={{ color: 'var(--color-text)' }}>Check</h1>
              <h1 className="text-5xl font-light leading-none" style={{ color: 'var(--color-gold)' }}>Your inbox</h1>
            </div>

            <div className="mb-6" style={{ height: 1, background: 'var(--color-border)' }} />

            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-dim)' }}>
              We sent a reset link to{' '}
              <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
              {' '}Check your spam folder if it doesn&apos;t arrive within a minute.
            </p>

            <Link href="/login"
              className="flex items-center justify-between px-5 py-4 font-semibold text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-dim)' }}>
              <span>Back to sign in</span>
              <span style={{ color: 'var(--color-gold)' }}>→</span>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
