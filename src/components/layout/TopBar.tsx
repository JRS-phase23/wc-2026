'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SoccerIcon } from '@/components/profile/SoccerIcons'
import ProfileSheet from '@/components/profile/ProfileSheet'
import type { Profile } from '@/types'

export default function TopBar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('id,email,team_name,icon_key,icon_url,created_at')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data as Profile)
    }
    load()
  }, [])

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 border-b"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          height: 52,
        }}
      >
        {/* Phase23 logo — links to dashboard */}
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/phase23-logo.svg"
            alt="Phase23"
            width={90}
            height={10}
            className="flex-shrink-0"
            style={{ height: 'auto' }}
            priority
          />
          <span
            className="text-xs font-semibold whitespace-nowrap hidden sm:block"
            style={{ color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}
          >
            World Cup Pick&apos;em
          </span>
        </Link>

        {/* Profile avatar — opens sheet */}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 pl-2 py-1 rounded-xl transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {profile ? (
            <>
              <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--color-text)' }}>
                {profile.team_name}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,67,35,0.15)', border: '1px solid rgba(239,67,35,0.3)' }}
              >
                {profile.icon_key === 'custom' && profile.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.icon_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <SoccerIcon iconKey={profile.icon_key ?? 'football'} size={18} color="#EF4323" />
                )}
              </div>
            </>
          ) : (
            <div className="w-8 h-8 rounded-full" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
          )}
        </button>
      </header>

      {/* Profile edit sheet */}
      {sheetOpen && profile && (
        <ProfileSheet
          profile={profile}
          onClose={() => setSheetOpen(false)}
          onSaved={updated => setProfile(updated)}
        />
      )}
    </>
  )
}
