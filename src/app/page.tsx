import Link from 'next/link'
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
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--color-gold)' }}>WC 2026</span>
          <span className="font-light text-sm" style={{ color: 'var(--color-text-dim)' }}>Pick&apos;em</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-dim)' }}>
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}
          >
            Join free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="animate-slide-up max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(239,67,35,0.12)', color: 'var(--color-gold)', border: '1px solid rgba(239,67,35,0.25)' }}>
            🏆 FIFA World Cup 2026 · Canada / Mexico / USA
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--color-text)' }}>
            Predict. Score.{' '}
            <span style={{ color: 'var(--color-gold)' }}>Dominate.</span>
          </h1>

          <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
            The smartest World Cup pick&apos;em. Predict every match score, earn points at every stage, and climb the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-6 py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--color-gold)', color: '#0A0A0F' }}
            >
              Create your team →
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl font-semibold text-base border transition-colors hover:border-white/20"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-20 max-w-2xl w-full stagger">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl text-left"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgba(239,67,35,0.12)' }}>
                <Icon size={18} style={{ color: 'var(--color-gold)' }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Scoring legend */}
        <div className="mt-12 p-5 rounded-2xl max-w-md w-full text-left"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>Scoring system</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Correct result (W/D/L)', '5 pts'],
              ['Correct goal difference', '5 pts'],
              ['Exact scoreline', '10 pts'],
              ['Close in high-scoring game', '3 pts'],
              ['Correct knockout team', '10 pts'],
              ['Final / 3rd place winner', '10 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between col-span-1">
                <span style={{ color: 'var(--color-text-dim)' }}>{label}</span>
                <span className="font-bold ml-2" style={{ color: 'var(--color-gold)' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs" style={{ color: 'var(--color-text-dim)', borderTop: '1px solid var(--color-border)' }}>
        WC 2026 Pick&apos;em · Not affiliated with FIFA
      </footer>
    </div>
  )
}
