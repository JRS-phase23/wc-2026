'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SoccerIcon, PRESET_ICONS } from './SoccerIcons'
import { Check, Upload, X, Loader2 } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: (updated: Profile) => void
}

export default function ProfileSheet({ profile, onClose, onSaved }: Props) {
  const [teamName, setTeamName] = useState(profile.team_name)
  const [iconKey, setIconKey] = useState(profile.icon_key ?? 'football')
  const [iconUrl, setIconUrl] = useState<string | null>(profile.icon_url ?? null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isCustom = iconKey === 'custom' && iconUrl

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB')
      return
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/icon.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setIconUrl(publicUrl)
    setIconKey('custom')
    setUploading(false)
  }

  async function save() {
    if (!teamName.trim()) { setError('Team name cannot be empty'); return }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        team_name: teamName.trim(),
        icon_key: iconKey,
        icon_url: iconKey === 'custom' ? iconUrl : null,
      })
      .eq('id', profile.id)
      .select()
      .single()

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    onSaved(data as Profile)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 animate-slide-up overflow-y-auto max-h-[90dvh]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border)' }} />

        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Edit Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-text-dim)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Team name */}
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
          Team Name
        </label>
        <input
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          maxLength={30}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold mb-5 outline-none"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />

        {/* Icon picker */}
        <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-dim)' }}>
          Team Icon
        </label>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_ICONS.map(preset => {
            const active = iconKey === preset.key
            return (
              <button
                key={preset.key}
                onClick={() => { setIconKey(preset.key); setIconUrl(null) }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                style={{
                  background: active ? 'rgba(239,67,35,0.15)' : 'var(--color-surface-2)',
                  border: active ? '1px solid rgba(239,67,35,0.5)' : '1px solid var(--color-border)',
                }}
              >
                <SoccerIcon
                  iconKey={preset.key}
                  size={28}
                  color={active ? '#EF4323' : 'var(--color-text-dim)'}
                />
                <span className="text-xs" style={{ color: active ? '#EF4323' : 'var(--color-text-dim)', fontSize: 10 }}>
                  {preset.label}
                </span>
              </button>
            )
          })}

          {/* Custom upload tile */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all relative overflow-hidden"
            style={{
              background: isCustom ? 'rgba(239,67,35,0.15)' : 'var(--color-surface-2)',
              border: isCustom ? '1px solid rgba(239,67,35,0.5)' : '1px solid var(--color-border)',
            }}
          >
            {isCustom && iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconUrl} alt="custom" className="w-7 h-7 rounded-full object-cover" />
            ) : uploading ? (
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-dim)' }} />
            ) : (
              <Upload size={22} style={{ color: isCustom ? '#EF4323' : 'var(--color-text-dim)' }} />
            )}
            <span className="text-xs" style={{ color: isCustom ? '#EF4323' : 'var(--color-text-dim)', fontSize: 10 }}>
              Upload
            </span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleUpload}
        />

        {error && (
          <p className="text-xs mb-3" style={{ color: 'var(--color-red-score)' }}>{error}</p>
        )}

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mt-2"
          style={{ background: 'var(--color-gold)', color: '#fff' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </>
  )
}
