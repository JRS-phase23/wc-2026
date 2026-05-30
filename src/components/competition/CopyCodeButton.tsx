'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
      style={{
        background: copied ? 'rgba(0,135,90,0.12)' : 'var(--color-surface-2)',
        color: copied ? 'var(--color-green-score)' : 'var(--color-text-dim)',
        border: `1px solid ${copied ? 'rgba(0,135,90,0.3)' : 'var(--color-border)'}`,
      }}
    >
      {copied ? <Check size={11} /> : <Link2 size={11} />}
      {copied ? 'Link copied!' : `Invite · ${code}`}
    </button>
  )
}
