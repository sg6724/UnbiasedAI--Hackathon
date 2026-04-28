import { useState } from 'react'
import { Zap, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { mitigateDataset } from '@/lib/api'
import type { MitigateResponse, ModelType, MitigationTechnique } from '@/types/fairlens'

interface Props {
  fileId: string
  sensitiveCol: string
  targetCol: string
  modelType: ModelType
}

const METRIC_LABELS: Record<string, string> = {
  demographic_parity_difference: 'Demographic Parity Diff.',
  disparate_impact_ratio: 'Disparate Impact Ratio',
  equalized_odds_difference: 'Equalized Odds Diff.',
  mean_difference: 'Mean Difference',
}

export default function MitigationPanel({ fileId, sensitiveCol, targetCol, modelType }: Props) {
  const [loading, setLoading] = useState<MitigationTechnique | null>(null)
  const [result, setResult] = useState<MitigateResponse | null>(null)
  const [error, setError] = useState('')

  const run = async (technique: MitigationTechnique) => {
    setLoading(technique)
    setError('')
    try {
      const res = await mitigateDataset(fileId, sensitiveCol, targetCol, modelType, technique)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mitigation failed')
    } finally {
      setLoading(null)
    }
  }

  const isDIR = (key: string) => key === 'disparate_impact_ratio'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Bias Mitigation</h3>
        <p className="text-sm text-slate-500 mt-0.5">Apply a technique to reduce detected bias and see before/after results</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run('reweighing')}
          disabled={!!loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          {loading === 'reweighing' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
          Apply Reweighing
        </button>
        <button
          onClick={() => run('threshold')}
          disabled={!!loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          {loading === 'threshold' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
          Threshold Optimization
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

      {result && (
        <div className="animate-fade-in space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-green-800">{result.improvement}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-medium text-slate-600">Metric</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">Before</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">After</th>
                  <th className="text-right py-2 pl-3 font-medium text-slate-600">Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.before).map(([key, bVal]) => {
                  const aVal = result.after[key as keyof typeof result.after]
                  const improved = isDIR(key) ? aVal > bVal : aVal < bVal
                  const same = Math.abs(aVal - bVal) < 0.001
                  const diff = aVal - bVal
                  return (
                    <tr key={key} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 text-slate-700">{METRIC_LABELS[key] || key}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{bVal.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">{aVal.toFixed(3)}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${same ? 'text-slate-400' : improved ? 'text-green-600' : 'text-red-500'}`}>
                          {same ? <Minus className="w-3 h-3" /> : improved ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
