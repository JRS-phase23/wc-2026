'use client'

import { useState } from 'react'
import { ClipboardCopy, Check } from 'lucide-react'

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
      style={{ background: 'var(--color-surface-2)', color: copied ? 'var(--color-green-score)' : 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}
    >
      {copied ? <Check size={11} /> : <ClipboardCopy size={11} />}
      {copied ? 'Copied!' : `Code: ${code}`}
    </button>
  )
}
