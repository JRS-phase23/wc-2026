'use client'

import { useState } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/join/${code}`

    // iOS/Android: native share sheet is far more reliable than clipboard
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: 'Join my World Cup Pick\'em' })
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        // User dismissed the share sheet — no error needed
      }
      return
    }

    // Desktop: try modern clipboard API, fall back to execCommand
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const canShare = typeof window !== 'undefined' && typeof navigator.share === 'function'

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
      style={{
        background: copied ? 'rgba(0,135,90,0.12)' : 'var(--color-surface-2)',
        color: copied ? 'var(--color-green-score)' : 'var(--color-text-dim)',
        border: `1px solid ${copied ? 'rgba(0,135,90,0.3)' : 'var(--color-border)'}`,
      }}
    >
      {copied ? <Check size={11} /> : canShare ? <Share2 size={11} /> : <Link2 size={11} />}
      {copied ? (canShare ? 'Shared!' : 'Link copied!') : `Invite · ${code}`}
    </button>
  )
}
