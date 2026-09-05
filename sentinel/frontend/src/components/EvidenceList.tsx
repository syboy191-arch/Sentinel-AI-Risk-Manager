import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface EvidenceListProps {
  explanations: string[]
  className?: string
}

export default function EvidenceList({ explanations, className = '' }: EvidenceListProps) {
  if (!explanations || explanations.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-emerald-400 text-sm ${className}`}>
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>No risk indicators or anomalies detected.</span>
      </div>
    )
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {explanations.map((exp, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2.5 text-sm text-slate-300 bg-slate-900/40 border border-slate-800/80 rounded-lg p-3"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{exp}</span>
        </li>
      ))}
    </ul>
  )
}
