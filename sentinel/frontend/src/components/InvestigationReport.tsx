import { Bot, Cpu, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react'

export interface InvestigationData {
  summary: string
  key_findings: string[]
  risk_assessment?: string
  recommendation: 'ALLOW' | 'HOLD' | 'ESCALATE'
  confidence: number
  source?: string
}

interface InvestigationReportProps {
  investigation: InvestigationData
  className?: string
}

export default function InvestigationReport({
  investigation,
  className = '',
}: InvestigationReportProps) {
  const recColors = {
    ALLOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    HOLD: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    ESCALATE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  const recIcons = {
    ALLOW: CheckCircle2,
    HOLD: ShieldAlert,
    ESCALATE: AlertTriangle,
  }

  const RecIcon = recIcons[investigation.recommendation] || AlertTriangle
  const isAi = investigation.source === 'ai'

  return (
    <div className={`space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {/* Header with Source & Confidence */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {isAi ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bot className="w-3.5 h-3.5" />
              AI-Generated Analysis
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <Cpu className="w-3.5 h-3.5" />
              Rule-Based Fallback
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Confidence: <span className="font-semibold text-white">{investigation.confidence}%</span>
        </div>
      </div>

      {/* Summary */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Executive Summary
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          {investigation.summary}
        </p>
      </div>

      {/* Key Findings */}
      {investigation.key_findings && investigation.key_findings.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Key Findings
          </h4>
          <ul className="space-y-1.5">
            {investigation.key_findings.map((finding, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/20 p-2 rounded border border-slate-800/40"
              >
                <span className="text-cyan-400 font-bold">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Assessment */}
      {investigation.risk_assessment && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Technical Risk Assessment
          </h4>
          <p className="text-xs text-slate-300 bg-slate-950/30 p-2.5 rounded border border-slate-800/50">
            {investigation.risk_assessment}
          </p>
        </div>
      )}

      {/* Recommendation Badge */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recommendation
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-xs uppercase tracking-wider ${
            recColors[investigation.recommendation] || recColors.HOLD
          }`}
        >
          <RecIcon className="w-4 h-4" />
          {investigation.recommendation}
        </span>
      </div>
    </div>
  )
}
