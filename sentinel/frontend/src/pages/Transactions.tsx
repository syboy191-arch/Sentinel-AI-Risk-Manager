import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RefreshCw,
  ListFilter,
  Inbox,
} from 'lucide-react'
import api from '../api/client'
import RiskBadge from '../components/RiskBadge'
import InvestigationPanel, { type Transaction } from '../components/InvestigationPanel'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import type { InvestigationData } from '../components/InvestigationReport'
import type { ApprovalAction } from '../components/ApprovalControls'

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
}

interface TransactionDetail {
  transaction: Transaction & {
    home_city: string
    avg_amount: number
  }
  features: Record<string, unknown>
  score: number
  risk_level: string
  explanations: string[]
  pattern: string | null
  investigation: InvestigationData | null
  decision: {
    id: string
    action: ApprovalAction
    override_reason?: string
    created_at: string
  } | null
  audit_events: Array<{
    event_type: string
    detail: string
    created_at: string
  }>
}

interface InvestigationResponse {
  investigation_id: string
  transaction_id: string
  summary: string
  key_findings: string[]
  risk_assessment: string
  recommendation: 'ALLOW' | 'HOLD' | 'ESCALATE'
  confidence: number
  source: string
  created_at: string
}

type SortField = 'risk_score' | 'timestamp'
type SortOrder = 'asc' | 'desc'

export default function Transactions() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const queryClient = useQueryClient()

  // Fetch transactions list
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<TransactionsResponse>({
    queryKey: ['transactions'],
    queryFn: () => api.get('/transactions?limit=100').then((res) => res.data),
    refetchInterval: 15000,
  })

  // Fetch single transaction detail when expanded
  const { data: transactionDetail, isLoading: isLoadingDetail } = useQuery<TransactionDetail>({
    queryKey: ['transaction', expandedId],
    queryFn: () => api.get(`/transactions/${expandedId}`).then((res) => res.data),
    enabled: !!expandedId,
  })

  // Mutation to trigger investigation
  const investigateMutation = useMutation({
    mutationFn: (transactionId: string) =>
      api.post<InvestigationResponse>(`/transactions/${transactionId}/investigate`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', expandedId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })

  // Mutation to record decision
  const decisionMutation = useMutation({
    mutationFn: ({
      transactionId,
      action,
      overrideReason,
    }: {
      transactionId: string
      action: ApprovalAction
      overrideReason?: string
    }) =>
      api
        .post(`/transactions/${transactionId}/decision`, {
          action,
          override_reason: overrideReason,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', expandedId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })

  // Auto-open highlighted transaction from query param
  useEffect(() => {
    if (highlightId) {
      setExpandedId(highlightId)
      setTimeout(() => {
        document.getElementById(`tx-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
  }, [highlightId, data])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedTransactions = data?.transactions.slice().sort((a, b) => {
    let compareA: number | string = 0
    let compareB: number | string = 0

    if (sortField === 'risk_score') {
      compareA = a.risk_score
      compareB = b.risk_score
    } else if (sortField === 'timestamp') {
      compareA = new Date(a.timestamp).getTime()
      compareB = new Date(b.timestamp).getTime()
    }

    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1
    } else {
      return compareA < compareB ? 1 : -1
    }
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-cyan-400" />
          <p className="text-slate-400 text-xs font-medium tracking-wide">Loading transaction ledger...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load transactions"
        description="Could not connect to the transaction store. Check your backend status."
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    )
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ListFilter className="w-6 h-6 text-cyan-400" />
            Transaction Ledger
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time feed of risk-scored transactions and decision history.
          </p>
        </div>

        <EmptyState
          icon={Inbox}
          title="No transactions found"
          description="Simulate fraud scenarios or trigger test payments to populate this ledger."
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ListFilter className="w-6 h-6 text-cyan-400" />
            Transaction Ledger
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {data.total} transactions logged · Click any row to expand the deep investigation drawer
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

      {/* Transactions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3.5 px-4 font-semibold">Transaction ID</th>
                <th className="py-3.5 px-4 font-semibold">User Profile</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center gap-1.5">
                    Risk Assessment
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'risk_score' ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => toggleSort('timestamp')}
                >
                  <div className="flex items-center gap-1.5">
                    Timestamp
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'timestamp' ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedTransactions?.map((tx) => {
                const isExpanded = expandedId === tx.id
                const isHighlighted = highlightId === tx.id

                return (
                  <tr
                    key={tx.id}
                    id={`tx-${tx.id}`}
                    className={`transition-colors group cursor-pointer ${
                      isHighlighted
                        ? 'bg-cyan-500/10'
                        : isExpanded
                        ? 'bg-slate-800/40'
                        : 'hover:bg-slate-800/20'
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300 font-medium">
                      <span className="truncate block max-w-[140px]">{tx.id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <span className="truncate block max-w-[150px]">{tx.user_name || tx.user_id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-100 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs whitespace-nowrap">
                      {tx.city}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RiskBadge level={tx.risk_level} score={tx.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize border ${
                          tx.status === 'cleared' || tx.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : tx.status === 'held'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : tx.status === 'under_review' || tx.status === 'flagged'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Expandable Details Container */}
        {expandedId && (
          <div className="bg-slate-950/90 p-6 border-t border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div>
                <h4 className="text-sm font-semibold text-white">Investigation Workspace</h4>
                <p className="text-xs text-slate-400">Analyzing transaction {expandedId}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg"
              >
                Close Panel
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-cyan-400" />
                  <p className="text-slate-400 text-xs font-medium">Extracting behavioral features & intelligence...</p>
                </div>
              </div>
            ) : transactionDetail ? (
              <InvestigationPanel
                transaction={transactionDetail.transaction}
                explanations={transactionDetail.explanations}
                investigation={transactionDetail.investigation}
                decision={transactionDetail.decision}
                onInvestigate={() => investigateMutation.mutate(expandedId)}
                onDecision={(action, overrideReason) =>
                  decisionMutation.mutate({
                    transactionId: expandedId,
                    action,
                    overrideReason,
                  })
                }
                isInvestigating={investigateMutation.isPending}
                isSubmittingDecision={decisionMutation.isPending}
              />
            ) : (
              <p className="text-slate-400 text-center text-sm py-8">
                Failed to load transaction details.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
