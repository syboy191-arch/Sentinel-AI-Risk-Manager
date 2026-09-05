import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex items-center justify-center py-16 px-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center backdrop-blur-sm ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-slate-400 shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1.5">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-sm">
            {description}
          </p>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
