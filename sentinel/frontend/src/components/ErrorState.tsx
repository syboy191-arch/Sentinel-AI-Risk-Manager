import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export default function ErrorState({
  title = 'Failed to load data',
  description = 'Please check your network connection and server status, then try again.',
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex items-center justify-center py-16 px-6 bg-rose-950/10 border border-rose-500/20 rounded-2xl text-center backdrop-blur-sm ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-rose-200 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-sm">
          {description}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin text-cyan-400' : ''}`} />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
