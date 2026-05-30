'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, Check } from 'lucide-react'

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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Reset password</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-dim)' }}>
            We&apos;ll send a reset link to your email
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,135,90,0.15)', border: '1px solid rgba(0,135,90,0.3)' }}>
              <Check size={26} style={{ color: 'var(--color-green-score)' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Check your inbox</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-dim)' }}>
              We sent a reset link to <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
              Check your spam folder if it doesn&apos;t arrive within a minute.
            </p>
            <Link href="/login"
              className="flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--color-gold)' }}>
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
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
              <Mail size={15} />
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--color-text-dim)' }}>
              <Link href="/login" className="flex items-center justify-center gap-1.5 font-semibold"
                style={{ color: 'var(--color-text-dim)' }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
