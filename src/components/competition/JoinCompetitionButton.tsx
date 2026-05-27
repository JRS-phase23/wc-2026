'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function JoinCompetitionButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data: comp, error: findErr } = await supabase
      .from('competitions')
      .select('id, name')
      .eq('join_code', code.trim().toUpperCase())
      .single()

    if (findErr || !comp) {
      setError('Competition not found. Check the code and try again.')
      setLoading(false)
      return
    }

    const { error: joinErr } = await supabase
      .from('competition_members')
      .upsert({ competition_id: comp.id, user_id: userId }, { onConflict: 'competition_id,user_id' })

    if (joinErr) {
      setError(joinErr.message)
      setLoading(false)
      return
    }

    router.push(`/competition/${comp.id}`)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-sm border transition-all hover:border-white/20 active:scale-95"
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        <Users size={16} />
        Join with code
      </button>
    )
  }

  return (
    <div className="col-span-2 p-4 rounded-2xl animate-fade-in" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="font-semibold mb-3 text-sm" style={{ color: 'var(--color-text)' }}>Enter join code</p>
      <form onSubmit={handleJoin} className="flex flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          required
          maxLength={6}
          placeholder="ABC123"
          autoFocus
          className="px-3 py-2.5 rounded-xl text-sm font-mono outline-none uppercase tracking-widest text-center"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setOpen(false); setCode(''); setError('') }}
            className="flex-1 py-2 rounded-xl text-sm border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading || code.length < 6}
            className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}>
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>
    </div>
  )
}
