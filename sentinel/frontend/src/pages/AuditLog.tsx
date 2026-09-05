import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  ShieldAlert,
  Cpu,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  X,
  Inbox,
} from 'lucide-react'
import api from '../api/client'
import RiskBadge from '../components/RiskBadge'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

interface AuditEvent {
  id: string
  transaction_id: string
  event_type: string
  detail: string
  created_at: string
  transaction_amount: number | null
  transaction_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null
  user_name: string | null
}

interface AuditLogResponse {
  events: AuditEvent[]
  total: number
  limit: number
  offset: number
  transaction_id_filter: string | null
}

export default function AuditLog() {
  const [filterTxId, setFilterTxId] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<AuditLogResponse>({
    queryKey: ['audit-log', activeFilter],
    queryFn: () => {
      const url = activeFilter
        ? `/audit-log?transaction_id=${encodeURIComponent(activeFilter)}&limit=100`
        : '/audit-log?limit=100'
      return api.get(url).then((res) => res.data)
    },
    refetchInterval: 10000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFilter(filterTxId.trim())
  }

  const handleClearFilter = () => {
    setFilterTxId('')
    setActiveFilter('')
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'transaction_created':
        return <Clock className="w-4 h-4 text-cyan-400" />
      case 'features_computed':
        return <Cpu className="w-4 h-4 text-indigo-400" />
      case 'risk_scored':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />
      case 'investigation_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'decision_recorded':
        return <UserCheck className="w-4 h-4 text-purple-400" />
      default:
        return <FileText className="w-4 h-4 text-slate-400" />
    }
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-cyan-400" />
          <p className="text-slate-400 text-xs font-medium tracking-wide">Loading audit log timeline...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load audit log"
        description="Unable to retrieve immutable system events. Please check the backend connection."
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            System Audit Log
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Complete, immutable trail of all transaction scoring, feature calculations, AI investigations, and human decisions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterTxId}
              onChange={(e) => setFilterTxId(e.target.value)}
              placeholder="Filter by Transaction ID (e.g. tx_norm_...)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            />
            {filterTxId && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              Filter Events
            </button>
            {activeFilter && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content */}
      {!data || data.events.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={activeFilter ? 'No events found for this Transaction ID' : 'No audit events recorded yet'}
          description={
            activeFilter
              ? 'Check the transaction ID formatting or clear the filter to view the full audit history.'
              : 'Run scenario simulations or process live transactions to populate this audit ledger.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing <strong className="text-slate-200">{data.events.length}</strong> of{' '}
              <strong className="text-slate-200">{data.total}</strong> recorded immutable events
            </span>
            {activeFilter && (
              <span>
                Filtered by: <code className="text-cyan-400 font-mono font-semibold">{activeFilter}</code>
              </span>
            )}
          </div>

          {/* Timeline Feed */}
          <div className="relative border-l-2 border-slate-800 ml-4 md:ml-6 space-y-5 pb-6">
            {data.events.map((event) => {
              return (
                <div key={event.id} className="relative pl-6 md:pl-8 group">
                  {/* Timeline Dot with Icon */}
                  <div className="absolute -left-[17px] top-2 w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center group-hover:border-cyan-400 transition-colors shadow-sm">
                    {getEventIcon(event.event_type)}
                  </div>

                  {/* Card */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-slate-700 transition-all backdrop-blur-sm shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 bg-slate-800/90 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/60">
                          {formatEventType(event.event_type)}
                        </span>

                        {event.transaction_risk_level && (
                          <RiskBadge level={event.transaction_risk_level} size="sm" />
                        )}

                        {event.user_name && (
                          <span className="text-xs text-slate-300 font-medium">
                            User: <strong className="text-white">{event.user_name}</strong>
                          </span>
                        )}

                        {event.transaction_amount !== null && (
                          <span className="text-xs font-mono font-semibold text-slate-100">
                            {formatCurrency(event.transaction_amount)}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Detail text */}
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 my-2 font-mono">
                      {event.detail}
                    </p>

                    {/* Transaction Link */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Transaction:</span>
                        <Link
                          to={`/transactions?highlight=${event.transaction_id}`}
                          className="inline-flex items-center gap-1 font-mono text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                        >
                          {event.transaction_id}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <span className="text-slate-500 text-[11px] font-mono">
                        Audit ID: {event.id}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
