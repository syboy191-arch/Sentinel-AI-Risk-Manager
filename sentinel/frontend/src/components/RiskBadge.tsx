interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  score?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function RiskBadge({ level, score, size = 'md' }: RiskBadgeProps) {
  const colors = {
    LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    HIGH: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 rounded-md font-semibold',
    md: 'text-xs px-3 py-1 rounded-lg font-semibold',
    lg: 'text-sm px-3.5 py-1.5 rounded-lg font-bold',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border tracking-wide uppercase ${colors[level]} ${sizes[size]}`}
    >
      <span>{level}</span>
      {score !== undefined && (
        <>
          <span className="text-slate-500 font-normal">·</span>
          <span className="font-mono">{score}/100</span>
        </>
      )}
    </span>
  )
}
