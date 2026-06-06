import Link from 'next/link'
import Image from 'next/image'
import { Trophy, Users, BarChart3, Zap } from 'lucide-react'

const features = [
  {
    icon: Trophy,
    title: 'Pick every match',
    desc: 'Predict scores for all 104 World Cup games — from group stage to the Final.',
  },
  {
    icon: Zap,
    title: 'Smart scoring',
    desc: 'Earn points for correct results, goal differences, exact scores, and more.',
  },
  {
    icon: Users,
    title: 'Private competitions',
    desc: 'Create a league, share a 6-character code, and compete with friends.',
  },
  {
    icon: BarChart3,
    title: 'Live stats',
    desc: 'Live leaderboard, prediction accuracy charts, and stage-by-stage breakdowns.',
  },
]

export default function LandingPage() {
  return (
    <div className="page-bloom min-h-dvh flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/phase23-logo.svg" alt="Phase23" width={88} height={10} style={{ height: 'auto' }} priority />
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            Sign in →
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-between gap-6 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: '#000', borderRadius: 3 }}
          >
            <span>Join free</span>
            <span style={{ color: 'var(--color-gold)' }}>→</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="animate-slide-up max-w-lg w-full">

          {/* Polestar-style stacked heading */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--color-text-dim)' }}>
              FIFA World Cup 2026 · Canada / Mexico / USA
            </p>
            <h1 className="text-6xl sm:text-7xl font-bold leading-none tracking-tight mb-1" style={{ color: 'var(--color-text)' }}>
              Predict.
            </h1>
            <h1 className="text-6xl sm:text-7xl font-bold leading-none tracking-tight" style={{ color: 'var(--color-gold)' }}>
              Dominate.
            </h1>
            <p className="text-base mt-6 leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--color-text-dim)' }}>
              The smartest World Cup pick&apos;em. Predict every match, earn points at every stage, and climb the leaderboard.
            </p>
          </div>

          {/* Polestar-style CTAs */}
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link
              href="/signup"
              className="flex items-center justify-between px-6 py-4 font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: '#fff', color: '#000', borderRadius: 3 }}
            >
              <span>Create your team</span>
              <span style={{ color: 'var(--color-gold)' }}>→</span>
            </Link>
            <Link
              href="/login"
              className="py-4 text-sm text-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>

        {/* Thin divider */}
        <div className="w-full max-w-lg mt-20 mb-10" style={{ height: 1, background: 'var(--color-border)' }} />

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full stagger">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgba(239,67,35,0.1)' }}>
                <Icon size={16} style={{ color: 'var(--color-gold)' }} />
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Scoring legend */}
        <div className="mt-8 p-5 rounded-2xl max-w-md w-full text-left"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>How scoring works</p>
          <div className="space-y-2">
            {[
              ['Correct result (W/D/L)', '5 pts'],
              ['Correct goal difference', '5 pts'],
              ['Exact scoreline', '10 pts'],
              ['Close in high-scoring game', '3 pts'],
              ['Correct knockout advancing team', '10 pts'],
              ['Tournament winner prediction', '25 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{label}</span>
                <span className="text-xs font-bold ml-4 flex-shrink-0" style={{ color: 'var(--color-gold)' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs" style={{ color: 'var(--color-text-dim)', borderTop: '1px solid var(--color-border)' }}>
        Phase23 World Cup Pick&apos;em · Not affiliated with FIFA
      </footer>
    </div>
  )
}
