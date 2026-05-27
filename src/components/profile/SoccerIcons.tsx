// Preset soccer icons — each renders a small SVG

export const PRESET_ICONS: { key: string; label: string }[] = [
  { key: 'ball-classic',  label: 'Classic Ball' },
  { key: 'ball-fire',     label: 'Fire Ball' },
  { key: 'ball-lightning',label: 'Lightning' },
  { key: 'jersey',        label: 'Jersey' },
  { key: 'trophy',        label: 'Trophy' },
  { key: 'boot',          label: 'Boot' },
  { key: 'whistle',       label: 'Whistle' },
  { key: 'star',          label: 'Star' },
]

interface IconProps { size?: number; color?: string }

function BallClassic({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.5" />
      <polygon points="16,6 20,10 18,15 14,15 12,10" fill={color} opacity=".9" />
      <polygon points="6,13 10,11 12,15 9,19 5,17" fill={color} opacity=".6" />
      <polygon points="26,13 22,11 20,15 23,19 27,17" fill={color} opacity=".6" />
      <polygon points="9,24 11,19 14,20 15,25 11,27" fill={color} opacity=".6" />
      <polygon points="23,24 21,19 18,20 17,25 21,27" fill={color} opacity=".6" />
    </svg>
  )
}

function BallFire({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="18" r="12" stroke={color} strokeWidth="1.5" />
      <path d="M16 6 C14 9 11 10 12 14 C13 11 15 11 16 13 C17 11 19 11 20 14 C21 10 18 9 16 6Z" fill={color} opacity=".85" />
      <path d="M16 10 C15 12 14 13 14.5 15 C15 13 16 13 16 14.5 C16 13 17 13 17.5 15 C18 13 17 12 16 10Z" fill={color} opacity=".5" />
    </svg>
  )
}

function BallLightning({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.5" />
      <path d="M18 4 L12 17 H17 L14 28 L22 14 H17 Z" fill={color} opacity=".9" />
    </svg>
  )
}

function Jersey({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10 4 L4 10 L8 12 L8 28 H24 L24 12 L28 10 L22 4 C22 4 20 7 16 7 C12 7 10 4 10 4Z" />
      <line x1="8" y1="12" x2="24" y2="12" />
    </svg>
  )
}

function Trophy({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10 4 H22 V16 C22 20.4 19.3 22 16 22 C12.7 22 10 20.4 10 16 Z" />
      <path d="M10 8 H6 C6 8 5 14 10 15" />
      <path d="M22 8 H26 C26 8 27 14 22 15" />
      <line x1="16" y1="22" x2="16" y2="26" />
      <line x1="11" y1="26" x2="21" y2="26" />
      <line x1="11" y1="28" x2="21" y2="28" />
    </svg>
  )
}

function Boot({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M8 4 L8 20 C8 20 8 24 12 25 L26 25 L26 22 L14 22 C14 22 12 22 12 20 L12 4 Z" />
      <line x1="8" y1="10" x2="12" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
      <circle cx="20" cy="27" r="2" fill={color} stroke="none" opacity=".7" />
      <circle cx="13" cy="27" r="2" fill={color} stroke="none" opacity=".7" />
    </svg>
  )
}

function Whistle({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
      <circle cx="12" cy="20" r="8" />
      <circle cx="12" cy="20" r="3" fill={color} opacity=".5" stroke="none" />
      <path d="M18 16 L26 8 L28 10 L22 18" />
      <path d="M24 6 L28 10" />
    </svg>
  )
}

function Star({ size = 32, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3 L19.5 12.5 L29.5 12.5 L21.5 18.5 L24.5 28.5 L16 22.5 L7.5 28.5 L10.5 18.5 L2.5 12.5 L12.5 12.5 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity=".3" />
    </svg>
  )
}

export function SoccerIcon({ iconKey, size = 32, color = 'currentColor' }: { iconKey: string; size?: number; color?: string }) {
  switch (iconKey) {
    case 'ball-classic':   return <BallClassic size={size} color={color} />
    case 'ball-fire':      return <BallFire size={size} color={color} />
    case 'ball-lightning': return <BallLightning size={size} color={color} />
    case 'jersey':         return <Jersey size={size} color={color} />
    case 'trophy':         return <Trophy size={size} color={color} />
    case 'boot':           return <Boot size={size} color={color} />
    case 'whistle':        return <Whistle size={size} color={color} />
    case 'star':           return <Star size={size} color={color} />
    default:               return <BallClassic size={size} color={color} />
  }
}
