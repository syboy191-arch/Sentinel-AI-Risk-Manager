import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Clock,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import api from '../api/client'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

interface DashboardSummary {
  total_transactions: number
  risk_level_counts: {
    LOW: number
    MEDIUM: number
    HIGH: number
  }
  transactions_under_review: number
  potential_loss_prevented_estimate: number
  potential_loss_prevented_note: string
  time_series: {
    transactions_per_day: Array<{ date: string; count: number }>
    risk_level_per_day: Array<{
      date: string
      LOW: number
      MEDIUM: number
      HIGH: number
    }>
  }
}

interface Transaction {
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

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
}

// Global Risk Palette constants (identical across components, badges, charts)
const RISK_COLORS = {
  LOW: '#10b981', // emerald-500
  MEDIUM: '#f59e0b', // amber-500
  HIGH: '#f43f5e', // rose-500
  CYAN: '#06b6d4', // cyan-500
}

export default function Dashboard() {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((res) => res.data),
    refetchInterval: 10000,
  })

  const {
    data: recentTransactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<TransactionsResponse>({
    queryKey: ['recent-transactions'],
    queryFn: () => api.get('/transactions?limit=50').then((res) => res.data),
    refetchInterval: 10000,
  })

  // Filter HIGH risk transactions for live alerts
  const highRiskAlerts =
    recentTransactions?.transactions
      .filter((tx) => tx.risk_level === 'HIGH')
      .slice(0, 5) || []

  const isLoading = summaryLoading || transactionsLoading
  const isError = summaryError || transactionsError

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-cyan-400" />
          <p className="text-slate-400 text-xs font-medium tracking-wide">Loading command center analytics...</p>
        </div>
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Failed to load dashboard summary"
        description="Unable to connect to the risk scoring backend. Please ensure the server is active."
        onRetry={() => {
          refetchSummary()
          refetchTransactions()
        }}
        isRetrying={isRefetchingSummary}
      />
    )
  }

  const isEmpty = summary.total_transactions === 0

  if (isEmpty) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-cyan-400" />
            Risk Command Center
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time transaction volume, risk distribution, and high-priority fraud alerts.
          </p>
        </div>

        <EmptyState
          icon={Activity}
          title="No transactions recorded yet"
          description="Simulate realistic fraud attack scenarios or stream transaction data to populate the dashboard."
          action={
            <Link
              to="/simulator"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20"
            >
              Launch Simulator <ArrowRight className="w-4 h-4" />
            </Link>
          }
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
            <LayoutDashboard className="w-6 h-6 text-cyan-400" />
            Risk Command Center
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time transaction volume, risk distribution, and high-priority fraud alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time monitoring active</span>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <MetricCard
          title="Total Transactions"
          value={summary.total_transactions.toLocaleString()}
          subtitle="Lifetime processed"
          icon={<Activity className="w-4 h-4" />}
          colorVariant="default"
        />
        <MetricCard
          title="Low Risk"
          value={summary.risk_level_counts.LOW.toLocaleString()}
          subtitle={`${((summary.risk_level_counts.LOW / summary.total_transactions) * 100).toFixed(1)}% safe baseline`}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          colorVariant="low"
        />
        <MetricCard
          title="Medium Risk"
          value={summary.risk_level_counts.MEDIUM.toLocaleString()}
          subtitle={`${((summary.risk_level_counts.MEDIUM / summary.total_transactions) * 100).toFixed(1)}% elevated scrutiny`}
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          colorVariant="medium"
        />
        <MetricCard
          title="High Risk"
          value={summary.risk_level_counts.HIGH.toLocaleString()}
          subtitle={`${((summary.risk_level_counts.HIGH / summary.total_transactions) * 100).toFixed(1)}% critical threats`}
          icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
          colorVariant="high"
        />
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <MetricCard
          title="Transactions Under Review"
          value={summary.transactions_under_review.toLocaleString()}
          subtitle="Currently held or awaiting analyst escalation"
          icon={<Clock className="w-4 h-4" />}
          colorVariant="cyan"
        />
        <MetricCard
          title="Potential Loss Prevented"
          value={formatCurrency(summary.potential_loss_prevented_estimate)}
          subtitle="Estimate: Uncleared HIGH risk transactions"
          icon={<DollarSign className="w-4 h-4" />}
          colorVariant="default"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Line Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Transaction Volume (14 Days)
            </h3>
            <span className="text-xs text-slate-500 font-mono">Daily aggregate</span>
          </div>

          {summary.time_series.transactions_per_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={summary.time_series.transactions_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600, fontSize: '12px' }}
                  itemStyle={{ color: '#22d3ee', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Transactions"
                  stroke={RISK_COLORS.CYAN}
                  strokeWidth={2.5}
                  dot={{ fill: RISK_COLORS.CYAN, r: 3 }}
                  activeDot={{ r: 6, fill: '#fff', stroke: RISK_COLORS.CYAN, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">No volume data in this timeframe</div>
          )}
        </div>

        {/* Risk Distribution Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Risk Distribution by Band (14 Days)
            </h3>
            <span className="text-xs text-slate-500 font-mono">Severity breakdown</span>
          </div>

          {summary.time_series.risk_level_per_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.time_series.risk_level_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600, fontSize: '12px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Bar dataKey="LOW" name="Low" stackId="a" fill={RISK_COLORS.LOW} radius={[0, 0, 0, 0]} />
                <Bar dataKey="MEDIUM" name="Medium" stackId="a" fill={RISK_COLORS.MEDIUM} radius={[0, 0, 0, 0]} />
                <Bar dataKey="HIGH" name="High" stackId="a" fill={RISK_COLORS.HIGH} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">No risk trend data in this timeframe</div>
          )}
        </div>
      </div>

      {/* Live High Risk Alerts Feed */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Live High Risk Alerts
          </h3>
          <span className="text-xs text-slate-500">Latest critical anomalies requiring review</span>
        </div>

        {highRiskAlerts.length > 0 ? (
          <div className="space-y-3">
            {highRiskAlerts.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl hover:border-rose-500/50 hover:bg-rose-950/30 transition-all gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded uppercase tracking-wider border border-rose-500/30">
                      HIGH RISK
                    </span>
                    <span className="text-sm font-semibold text-white truncate">
                      {tx.user_name || tx.user_id}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-sm font-mono font-bold text-slate-100">
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{tx.city}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono text-slate-500">{tx.id}</span>
                    <span>·</span>
                    <span>Score: <strong className="text-rose-400 font-mono">{tx.risk_score}/100</strong></span>
                    <span>·</span>
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <Link
                  to={`/transactions?highlight=${tx.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto shadow-md shadow-cyan-500/10"
                >
                  Investigate <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-950/30 rounded-xl border border-slate-800/60">
            <ShieldCheck className="mx-auto w-8 h-8 text-emerald-400 mb-2 opacity-80" />
            <p className="text-sm font-medium text-slate-300">All transactions within acceptable risk thresholds</p>
            <p className="text-xs text-slate-500 mt-0.5">No critical threats detected across recent traffic</p>
          </div>
        )}
      </div>
    </div>
  )
}
