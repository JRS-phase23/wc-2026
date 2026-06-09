'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinCodeInput() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 6) router.push(`/join/${trimmed}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>
          Invite code
        </label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="w-full px-4 py-3 text-sm font-mono uppercase outline-none"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 3,
            color: 'var(--color-text)',
            letterSpacing: '0.2em',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={code.trim().length < 6}
        className="flex items-center justify-between px-6 py-4 font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--color-gold)', color: '#fff', borderRadius: 3 }}
      >
        <span>Join game</span>
        <span>→</span>
      </button>
    </form>
  )
}
