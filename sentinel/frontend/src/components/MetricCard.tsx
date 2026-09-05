import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: string
    positive?: boolean
  }
  colorVariant?: 'default' | 'low' | 'medium' | 'high' | 'cyan'
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  colorVariant = 'default',
}: MetricCardProps) {
  const borderColors = {
    default: 'border-slate-800 bg-slate-900/60',
    low: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    medium: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    high: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
    cyan: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400',
  }

  const valueColors = {
    default: 'text-white',
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-rose-400',
    cyan: 'text-cyan-400',
  }

  return (
    <div
      className={`rounded-xl border p-5 backdrop-blur-sm transition-all hover:border-slate-700 ${borderColors[colorVariant]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-2">
        <div className={`text-2xl font-bold tracking-tight ${valueColors[colorVariant]}`}>
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
