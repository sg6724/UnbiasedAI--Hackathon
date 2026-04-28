import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import VerdictBanner from '@/components/VerdictBanner'
import MetricCard from '@/components/MetricCard'
import GroupComparisonChart from '@/components/GroupComparisonChart'
import ProxyWarning from '@/components/ProxyWarning'
import MitigationPanel from '@/components/MitigationPanel'
import type { ResultsState } from '@/types/fairlens'

function getMetricStatus(key: string, value: number): 'pass' | 'borderline' | 'fail' {
  if (key === 'disparate_impact_ratio') {
    if (value > 0.8) return 'pass'
    if (value > 0.6) return 'borderline'
    return 'fail'
  }
  if (value < 0.1) return 'pass'
  if (value < 0.2) return 'borderline'
  return 'fail'
}

const METRIC_META = {
  demographic_parity_difference: { label: 'Demographic Parity Difference', desc: 'Gap in positive prediction rates between groups', ideal: '0.0' },
  disparate_impact_ratio: { label: 'Disparate Impact Ratio', desc: 'Ratio of positive rates (unprivileged / privileged). Below 0.8 is legally concerning.', ideal: '1.0' },
  equalized_odds_difference: { label: 'Equalized Odds Difference', desc: 'Max gap in true/false positive rates across groups', ideal: '0.0' },
  mean_difference: { label: 'Mean Difference', desc: 'Raw difference in positive outcome rates between groups', ideal: '0.0' },
}

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ResultsState | null

  if (!state) { navigate('/'); return null }

  const { analyzeResult, fileId, sensitiveCol, targetCol, modelType, fileName } = state
  const { metrics, proxy_features, verdict } = analyzeResult

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span>Upload</span><ChevronRight className="w-4 h-4" /><span>Configure</span><ChevronRight className="w-4 h-4" /><span className="text-indigo-600 font-medium">Results</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Results</h1>
              <p className="text-sm text-slate-500 mt-1">
                {fileName} · Sensitive: <strong>{sensitiveCol}</strong> · Target: <strong>{targetCol}</strong>
              </p>
            </div>
            <button
              onClick={() => navigate('/report', { state })}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              View Full Report <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <VerdictBanner verdict={verdict} />

        {/* Metric Cards */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Fairness Metrics</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(METRIC_META).map(([key, meta]) => {
              const value = metrics[key as keyof typeof METRIC_META] as number
              return (
                <MetricCard
                  key={key}
                  label={meta.label}
                  value={value}
                  description={meta.desc}
                  ideal={meta.ideal}
                  status={getMetricStatus(key, value)}
                />
              )
            })}
          </div>
        </div>

        {/* Group Comparison */}
        {Object.keys(metrics.by_group).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Group Comparison</h2>
            <p className="text-sm text-slate-500 mb-5">Selection rate, accuracy and true positive rate by group</p>
            <GroupComparisonChart byGroup={metrics.by_group} />

            {/* Group table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-2 font-medium text-slate-600">Group</th>
                    <th className="pb-2 font-medium text-slate-600 text-right">Selection Rate</th>
                    <th className="pb-2 font-medium text-slate-600 text-right">Accuracy</th>
                    <th className="pb-2 font-medium text-slate-600 text-right">TPR</th>
                    <th className="pb-2 font-medium text-slate-600 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics.by_group).map(([group, m]) => (
                    <tr key={group} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{group}</td>
                      <td className="py-2 text-right text-slate-600">{(m.selection_rate * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-slate-600">{(m.accuracy * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-slate-600">{(m.tpr * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-slate-400">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ProxyWarning proxyFeatures={proxy_features} sensitiveCol={sensitiveCol} />

        <MitigationPanel
          fileId={fileId}
          sensitiveCol={sensitiveCol}
          targetCol={targetCol}
          modelType={modelType}
        />

        <div className="flex justify-end">
          <button
            onClick={() => navigate('/report', { state })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            View Full Audit Report <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
