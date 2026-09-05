import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap,
  DollarSign,
  CreditCard,
  Gauge,
  Globe,
  UserX,
  CheckCircle2,
  Loader2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import api from '../api/client'
import InvestigationPanel, { type Transaction } from '../components/InvestigationPanel'
import ErrorState from '../components/ErrorState'
import type { InvestigationData } from '../components/InvestigationReport'
import type { ApprovalAction } from '../components/ApprovalControls'

interface SimulateResponse {
  transaction: Transaction
  features: Record<string, unknown>
  score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  explanations: string[]
  pattern: string | null
  investigation: InvestigationData | null
  decision?: {
    id: string
    action: ApprovalAction
    override_reason?: string
    created_at: string
  } | null
}

type ScenarioType =
  | 'normal'
  | 'large_unusual'
  | 'card_testing'
  | 'velocity_attack'
  | 'impossible_travel'
  | 'account_takeover'

interface ScenarioConfig {
  id: ScenarioType
  label: string
  expectedBand: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  icon: typeof Zap
  colorClass: string
  hoverClass: string
  iconColorClass: string
  badgeClass: string
}

const scenarios: ScenarioConfig[] = [
  {
    id: 'normal',
    label: 'Normal Transaction',
    expectedBand: 'LOW',
    description: 'Standard recurring purchase matching customer profile and known devices.',
    icon: CheckCircle2,
    colorClass: 'border-emerald-500/30 bg-emerald-950/15',
    hoverClass: 'hover:border-emerald-500/50 hover:bg-emerald-950/25',
    iconColorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'large_unusual',
    label: 'Large Unusual Amount',
    expectedBand: 'MEDIUM',
    description: '8-12x typical spend volume originating from an unfamiliar retail merchant.',
    icon: DollarSign,
    colorClass: 'border-amber-500/30 bg-amber-950/15',
    hoverClass: 'hover:border-amber-500/50 hover:bg-amber-950/25',
    iconColorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    id: 'card_testing',
    label: 'Card Testing Sequence',
    expectedBand: 'MEDIUM',
    description: 'Rapid low-dollar verification micropayments followed by larger ticket authorization.',
    icon: CreditCard,
    colorClass: 'border-amber-500/30 bg-amber-950/15',
    hoverClass: 'hover:border-amber-500/50 hover:bg-amber-950/25',
    iconColorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    id: 'velocity_attack',
    label: 'High Velocity Burst',
    expectedBand: 'MEDIUM',
    description: '7+ rapid-fire authorization requests executed within a compressed 4-minute window.',
    icon: Gauge,
    colorClass: 'border-amber-500/30 bg-amber-950/15',
    hoverClass: 'hover:border-amber-500/50 hover:bg-amber-950/25',
    iconColorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    id: 'impossible_travel',
    label: 'Impossible Travel',
    expectedBand: 'HIGH',
    description: 'Transactions occurring in distant metropolitan areas 15 minutes apart (>800 km/h).',
    icon: Globe,
    colorClass: 'border-rose-500/30 bg-rose-950/15',
    hoverClass: 'hover:border-rose-500/50 hover:bg-rose-950/25',
    iconColorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  {
    id: 'account_takeover',
    label: 'Account Takeover (ATO)',
    expectedBand: 'HIGH',
    description: 'Critical compounding anomaly: unrecognized device, new geo-location, and high balance draw.',
    icon: UserX,
    colorClass: 'border-rose-500/30 bg-rose-950/15',
    hoverClass: 'hover:border-rose-500/50 hover:bg-rose-950/25',
    iconColorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
]

const pipelineStages = [
  { label: 'Ingesting transaction event', delay: 0 },
  { label: 'Computing multi-signal behavioral features', delay: 300 },
  { label: 'Scoring risk model & evaluating thresholds', delay: 600 },
  { label: 'Synthesizing explainability audit trail', delay: 900 },
  { label: 'Running Claude AI fraud intelligence (if HIGH risk)', delay: 1200 },
]

export default function Simulator() {
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [activeStage, setActiveStage] = useState<number>(-1)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null)

  const queryClient = useQueryClient()

  const simulateMutation = useMutation({
    mutationFn: (scenario: ScenarioType) =>
      api.post<SimulateResponse>('/transactions/simulate', { scenario }).then((res) => res.data),
    onMutate: (scenario) => {
      setSelectedScenario(scenario)
      setResult(null)
      setActiveStage(-1)
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: () => {
      setActiveStage(-1)
    },
  })

  // Mutation to trigger investigation
  const investigateMutation = useMutation({
    mutationFn: (transactionId: string) =>
      api.post(`/transactions/${transactionId}/investigate`).then((res) => res.data),
    onSuccess: () => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['transaction', result.transaction.id] })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        queryClient.invalidateQueries({ queryKey: ['audit-log'] })
        api
          .get<SimulateResponse>(`/transactions/${result.transaction.id}`)
          .then((res) => setResult(res.data))
      }
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
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['transaction', result.transaction.id] })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        queryClient.invalidateQueries({ queryKey: ['audit-log'] })
        api
          .get<SimulateResponse>(`/transactions/${result.transaction.id}`)
          .then((res) => setResult(res.data))
      }
    },
  })

  // Animate pipeline stages while mutation is pending
  useEffect(() => {
    if (simulateMutation.isPending) {
      pipelineStages.forEach((stage, index) => {
        setTimeout(() => {
          setActiveStage(index)
        }, stage.delay)
      })
    } else {
      setActiveStage(-1)
    }
  }, [simulateMutation.isPending])

  const handleSimulate = (scenario: ScenarioType) => {
    if (simulateMutation.isPending) return
    simulateMutation.mutate(scenario)
  }

  const handleReset = () => {
    setResult(null)
    setSelectedScenario(null)
    setActiveStage(-1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-cyan-400" />
            Transaction Simulator
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Trigger deterministic fraud attack patterns to test the multi-signal risk engine and AI investigation loop.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleReset}
            className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Simulation
          </button>
        )}
      </div>

      {/* Error Alert */}
      {simulateMutation.isError && (
        <ErrorState
          title="Simulation Failed"
          description={
            simulateMutation.error instanceof Error
              ? simulateMutation.error.message
              : 'Failed to simulate transaction. Please check server status and try again.'
          }
          onRetry={() => selectedScenario && handleSimulate(selectedScenario)}
          isRetrying={simulateMutation.isPending}
        />
      )}

      {/* Scenario Buttons Grid */}
      {!result && !simulateMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon
            return (
              <button
                key={scenario.id}
                type="button"
                disabled={simulateMutation.isPending}
                onClick={() => handleSimulate(scenario.id)}
                className={`group relative p-5 border rounded-2xl transition-all duration-200 text-left shadow-sm backdrop-blur-sm ${scenario.colorClass} ${scenario.hoverClass} disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 group-hover:scale-105 transition-transform ${scenario.iconColorClass}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase border ${scenario.badgeClass}`}
                    >
                      {scenario.expectedBand} RISK
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors">
                    {scenario.label}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">
                  <span>Run Scenario</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pipeline Animation */}
      {simulateMutation.isPending && (
        <div className="max-w-xl mx-auto py-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-3.5">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Simulating {scenarios.find((s) => s.id === selectedScenario)?.label}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Executing risk scoring and fraud analytics pipeline...</p>
            </div>

            <div className="space-y-2.5">
              {pipelineStages.map((stage, index) => {
                const isActive = index === activeStage
                const isCompleted = index < activeStage

                return (
                  <div
                    key={stage.label}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                      isActive
                        ? 'border-cyan-500/40 bg-cyan-950/20 shadow-sm'
                        : isCompleted
                        ? 'border-emerald-500/30 bg-emerald-950/15'
                        : 'border-slate-800/80 bg-slate-950/40'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : isCompleted
                          ? 'border-emerald-400 bg-emerald-500/20'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive
                          ? 'text-cyan-300 font-semibold'
                          : isCompleted
                          ? 'text-emerald-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Result Panel */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-5 gap-4 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-base font-bold text-white">Pipeline Execution Complete</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Scenario: <span className="font-semibold text-slate-200">{result.transaction.scenario_type}</span> · ID: <span className="font-mono text-cyan-400">{result.transaction.id}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Simulate Another Scenario
            </button>
          </div>

          <InvestigationPanel
            transaction={result.transaction}
            explanations={result.explanations}
            investigation={result.investigation}
            decision={result.decision}
            onInvestigate={
              !result.investigation
                ? () => investigateMutation.mutate(result.transaction.id)
                : undefined
            }
            onDecision={(action, overrideReason) =>
              decisionMutation.mutate({
                transactionId: result.transaction.id,
                action,
                overrideReason,
              })
            }
            isInvestigating={investigateMutation.isPending}
            isSubmittingDecision={decisionMutation.isPending}
          />
        </div>
      )}
    </div>
  )
}
