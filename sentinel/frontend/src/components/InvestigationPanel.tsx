import RiskBadge from './RiskBadge'
import EvidenceList from './EvidenceList'
import InvestigationReport, { type InvestigationData } from './InvestigationReport'
import ApprovalControls, { type ApprovalAction } from './ApprovalControls'
import { Loader2, Search } from 'lucide-react'

export interface Transaction {
  id: string
  user_id: string
  user_name: string
  amount: number
  city: string
  device_id: string
  timestamp: string
  scenario_type: string
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  status: string
}

interface InvestigationPanelProps {
  transaction: Transaction
  explanations?: string[]
  investigation?: InvestigationData | null
  decision?: {
    id: string
    action: ApprovalAction
    override_reason?: string
    created_at: string
  } | null
  onInvestigate?: () => Promise<void> | void
  onDecision?: (action: ApprovalAction, overrideReason?: string) => Promise<void> | void
  isInvestigating?: boolean
  isSubmittingDecision?: boolean
  className?: string
}

export default function InvestigationPanel({
  transaction,
  explanations = [],
  investigation,
  decision,
  onInvestigate,
  onDecision,
  isInvestigating = false,
  isSubmittingDecision = false,
  className = '',
}: InvestigationPanelProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Transaction Summary Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Transaction {transaction.id.slice(0, 12)}
            </h3>
            <p className="text-sm text-slate-400">
              {transaction.user_name || transaction.user_id} · {transaction.city}
            </p>
          </div>
          <RiskBadge level={transaction.risk_level} score={transaction.risk_score} size="lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
            <p className="font-semibold text-white">{formatCurrency(transaction.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
            <p className="font-semibold text-slate-200 capitalize">{transaction.status}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Scenario</p>
            <p className="font-semibold text-slate-200">{transaction.scenario_type}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Timestamp</p>
            <p className="font-semibold text-slate-200 text-xs">
              {new Date(transaction.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Indicators / Evidence */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Risk Indicators
        </h4>
        <EvidenceList explanations={explanations} />
      </div>

      {/* AI Investigation Section */}
      {investigation ? (
        <InvestigationReport investigation={investigation} />
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          {onInvestigate ? (
            <>
              <p className="text-sm text-slate-400 mb-3">
                No investigation has been run for this transaction yet.
              </p>
              <button
                type="button"
                onClick={onInvestigate}
                disabled={isInvestigating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInvestigating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Investigating...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Run AI Investigation
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">Investigation not available.</p>
          )}
        </div>
      )}

      {/* Decision Panel */}
      {decision ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
            Decision Recorded
          </h4>
          <div className="space-y-1 text-sm">
            <p className="text-slate-200">
              <span className="text-slate-400">Action:</span>{' '}
              <span className="font-semibold uppercase">{decision.action}</span>
            </p>
            {decision.override_reason && (
              <p className="text-slate-200">
                <span className="text-slate-400">Override Reason:</span>{' '}
                <span className="italic">{decision.override_reason}</span>
              </p>
            )}
            <p className="text-xs text-slate-400 pt-1">
              Recorded at {new Date(decision.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        onDecision && (
          <ApprovalControls
            currentStatus={transaction.status}
            aiRecommendation={investigation?.recommendation || null}
            onDecision={onDecision}
            isSubmitting={isSubmittingDecision}
          />
        )
      )}
    </div>
  )
}
