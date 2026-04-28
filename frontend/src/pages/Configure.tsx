import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Settings, Loader2, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { analyzeDataset } from '@/lib/api'
import type { ConfigureState, ResultsState, ModelType } from '@/types/fairlens'

const MODEL_OPTIONS: { value: ModelType; label: string; desc: string }[] = [
  { value: 'random_forest', label: 'Random Forest', desc: 'Best accuracy, most realistic' },
  { value: 'logistic_regression', label: 'Logistic Regression', desc: 'Interpretable, fast' },
  { value: 'decision_tree', label: 'Decision Tree', desc: 'Easy to explain visually' },
]

export default function Configure() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ConfigureState | null

  if (!state) {
    navigate('/')
    return null
  }

  const { fileId, columns, autoDetectedSensitive, fileName } = state

  const [sensitiveCol, setSensitiveCol] = useState<string>(autoDetectedSensitive[0] ?? columns[0])
  const [targetCol, setTargetCol] = useState<string>(
    columns.find(c => c !== (autoDetectedSensitive[0] ?? columns[0])) ?? columns[columns.length - 1]
  )
  const [modelType, setModelType] = useState<ModelType>('random_forest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRun = async () => {
    if (!sensitiveCol || !targetCol) return
    if (sensitiveCol === targetCol) { setError('Sensitive column and target column must be different.'); return }
    setError('')
    setLoading(true)
    try {
      const result = await analyzeDataset(fileId, sensitiveCol, targetCol, modelType, fileName)
      const nextState: ResultsState = { fileId, columns, autoDetectedSensitive, fileName, analyzeResult: result, sensitiveCol, targetCol, modelType }
      navigate('/results', { state: nextState })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const availableTargets = columns.filter(c => c !== sensitiveCol)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span>Upload</span><ChevronRight className="w-4 h-4" /><span className="text-indigo-600 font-medium">Configure</span><ChevronRight className="w-4 h-4" /><span>Results</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Configure Audit</h1>
          <p className="text-slate-500 mt-1 text-sm">File: <span className="font-medium text-slate-700">{fileName}</span> · {columns.length} columns</p>
        </div>

        <div className="space-y-6">
          {/* Sensitive Column */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-slate-900">Sensitive Attribute</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 ml-8">The protected characteristic to audit for bias</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {columns.map(col => (
                <button
                  key={col}
                  onClick={() => { setSensitiveCol(col); if (targetCol === col) setTargetCol(columns.find(c => c !== col) ?? '') }}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left truncate ${
                    sensitiveCol === col
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : autoDetectedSensitive.includes(col)
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {col}
                  {autoDetectedSensitive.includes(col) && sensitiveCol !== col && (
                    <span className="ml-1 text-xs opacity-60">★</span>
                  )}
                </button>
              ))}
            </div>
            {autoDetectedSensitive.length > 0 && (
              <p className="text-xs text-slate-400 mt-3">★ Auto-detected sensitive columns</p>
            )}
          </div>

          {/* Target Column */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-900">Target Outcome Column</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 ml-8">The outcome the model predicts (e.g. hired, income, credit_risk)</p>
            <select
              value={targetCol}
              onChange={e => setTargetCol(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {availableTargets.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Model Type */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold text-slate-900">Model Type</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 ml-8">Algorithm to train and audit</p>
            <div className="space-y-2">
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setModelType(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    modelType === opt.value
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {modelType === opt.value && <div className="w-4 h-4 rounded-full bg-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          <button
            onClick={handleRun}
            disabled={loading || !sensitiveCol || !targetCol}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
            {loading ? 'Running Bias Audit...' : 'Run Bias Audit'}
          </button>

          {loading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <p className="text-sm text-indigo-700 font-medium">Training model and computing fairness metrics...</p>
              <p className="text-xs text-indigo-500 mt-1">This may take 15–60 seconds depending on dataset size</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
