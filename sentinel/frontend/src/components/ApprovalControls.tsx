import { useState } from 'react'
import { Check, Ban, AlertCircle, AlertTriangle } from 'lucide-react'

export type ApprovalAction = 'APPROVE' | 'REJECT' | 'ESCALATE'

interface ApprovalControlsProps {
  currentStatus?: string
  aiRecommendation?: 'ALLOW' | 'HOLD' | 'ESCALATE' | null
  onDecision: (action: ApprovalAction, overrideReason?: string) => Promise<void> | void
  isSubmitting?: boolean
  className?: string
}

// Map analyst action to equivalent AI recommendation
const ACTION_TO_AI_REC: Record<ApprovalAction, 'ALLOW' | 'HOLD' | 'ESCALATE'> = {
  APPROVE: 'ALLOW',
  REJECT: 'HOLD',
  ESCALATE: 'ESCALATE',
}

export default function ApprovalControls({
  currentStatus,
  aiRecommendation,
  onDecision,
  isSubmitting = false,
  className = '',
}: ApprovalControlsProps) {
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [requiresOverride, setRequiresOverride] = useState(false)

  const handleActionClick = (action: ApprovalAction) => {
    setSelectedAction(action)

    // Check if analyst action differs from AI recommendation
    if (aiRecommendation) {
      const equivalentAi = ACTION_TO_AI_REC[action]
      if (equivalentAi !== aiRecommendation) {
        setRequiresOverride(true)
        return
      }
    }

    // Matches AI or no AI recommendation, submit directly
    setRequiresOverride(false)
    onDecision(action)
  }

  const handleConfirmOverride = () => {
    if (!selectedAction) return
    onDecision(selectedAction, overrideReason.trim() || undefined)
    setRequiresOverride(false)
    setSelectedAction(null)
    setOverrideReason('')
  }

  const handleCancelOverride = () => {
    setRequiresOverride(false)
    setSelectedAction(null)
    setOverrideReason('')
  }

  return (
    <div className={`space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Analyst Decision Workflow
        </h4>
        {currentStatus && (
          <span className="text-xs text-slate-400">
            Current Status: <span className="font-semibold text-slate-200 capitalize">{currentStatus}</span>
          </span>
        )}
      </div>

      {requiresOverride ? (
        <div className="space-y-3 p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Override Notice: You are selecting <strong className="uppercase">{selectedAction}</strong>, overriding AI recommendation (<strong className="uppercase">{aiRecommendation}</strong>).
            </span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Provide justification for audit compliance (optional):
            </label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Customer verified via outbound call, travel was pre-authorized..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelOverride}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmOverride}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Decision & Override'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleActionClick('APPROVE')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Approve (Allow)
          </button>

          <button
            type="button"
            onClick={() => handleActionClick('REJECT')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            Reject (Hold)
          </button>

          <button
            type="button"
            onClick={() => handleActionClick('ESCALATE')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <AlertCircle className="w-4 h-4" />
            Escalate Review
          </button>
        </div>
      )}
    </div>
  )
}
