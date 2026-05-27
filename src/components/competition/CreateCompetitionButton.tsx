'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateJoinCode } from '@/lib/utils'

export default function CreateCompetitionButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    let code = generateJoinCode()
    // Ensure uniqueness (retry up to 5 times)
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from('competitions').select('id').eq('join_code', code).single()
      if (!data) break
      code = generateJoinCode()
    }

    const { data, error: err } = await supabase
      .from('competitions')
      .insert({ name: name.trim(), join_code: code, admin_id: userId })
      .select('id')
      .single()

    if (err || !data) {
      setError(err?.message ?? 'Failed to create')
      setLoading(false)
      return
    }

    // Also add admin as a member
    await supabase.from('competition_members').insert({ competition_id: data.id, user_id: userId })

    router.push(`/competition/${data.id}`)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}
      >
        <Plus size={16} />
        New competition
      </button>
    )
  }

  return (
    <div className="col-span-2 p-4 rounded-2xl animate-fade-in" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="font-semibold mb-3 text-sm" style={{ color: 'var(--color-text)' }}>Name your competition</p>
      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={50}
          placeholder="e.g. Office World Cup"
          autoFocus
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="flex-1 py-2 rounded-xl text-sm border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
