import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Look up the competition
  const { data: comp } = await supabase
    .from('competitions')
    .select('id, name, join_code')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!comp) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 text-center"
        style={{ background: 'var(--color-bg)' }}>
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Competition not found
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-dim)' }}>
          The code <span className="font-mono font-bold">{code.toUpperCase()}</span> doesn&apos;t match any competition.
        </p>
        <Link href="/dashboard" style={{ color: 'var(--color-gold)' }} className="text-sm font-semibold">
          Go to dashboard →
        </Link>
      </div>
    )
  }

  // If already logged in — auto-join and redirect
  if (user) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('competition_members')
      .select('user_id')
      .eq('competition_id', comp.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      await supabase.from('competition_members').insert({
        competition_id: comp.id,
        user_id: user.id,
      })
    }
    redirect(`/competition/${comp.id}`)
  }

  // Not logged in — show landing
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 text-center"
      style={{ background: 'var(--color-bg)' }}>
      <Link href="/" className="flex flex-col items-center gap-2 mb-10">
        <Image src="/phase23-logo.svg" alt="Phase23" width={148} height={12} style={{ height: 'auto' }} priority />
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>World Cup Pick&apos;em</span>
      </Link>

      <div className="w-full max-w-sm p-6 rounded-2xl animate-slide-up"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-3xl mb-3">🏆</div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-dim)' }}>
          You&apos;re invited to join
        </p>
        <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text)' }}>
          {comp.name}
        </h1>

        <div className="space-y-3">
          <Link
            href={`/signup?next=/join/${code}`}
            className="flex items-center justify-center w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--color-gold)', color: '#fff' }}
          >
            Create account &amp; join →
          </Link>
          <Link
            href={`/login?next=/join/${code}`}
            className="flex items-center justify-center w-full py-3.5 rounded-xl font-semibold text-sm transition-colors"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            Sign in to join
          </Link>
        </div>
      </div>
    </div>
  )
}
