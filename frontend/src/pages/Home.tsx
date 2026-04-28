import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, ShieldCheck, Eye, BarChart2, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import FileUpload from '@/components/FileUpload'
import AuthModal from '@/components/AuthModal'
import { supabase } from '@/lib/supabase'
import { uploadDataset } from '@/lib/api'
import type { ConfigureState } from '@/types/fairlens'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const DEMO_DATASETS = [
  {
    name: 'Adult Income',
    description: 'UCI dataset — gender & race vs income prediction',
    bias: 'Men predicted high income 34% more than women',
    url: 'https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data',
    filename: 'adult_income.csv',
  },
  {
    name: 'German Credit',
    description: 'UCI dataset — age & gender vs credit risk',
    bias: 'Older applicants and women rated higher risk',
    url: 'https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data',
    filename: 'german_credit.csv',
  },
  {
    name: 'COMPAS Recidivism',
    description: 'ProPublica dataset — race vs recidivism score',
    bias: 'Black defendants flagged high risk at 2× white rate',
    url: 'https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv',
    filename: 'compas_recidivism.csv',
  },
]

const DEMO_HEADERS: Record<string, { header: string; delimiter: string; hasHeader?: boolean }> = {
  'adult_income.csv': {
    header: 'age,workclass,fnlwgt,education,education_num,marital_status,occupation,relationship,race,sex,capital_gain,capital_loss,hours_per_week,native_country,income',
    delimiter: ',',
  },
  'german_credit.csv': {
    header: 'status duration credit_history purpose credit_amount savings employment installment_rate personal_status_sex other_debtors residence_since property age other_installment_plans housing number_credits job people_liable telephone foreign_worker credit_risk',
    delimiter: ' ',
  },
  'compas_recidivism.csv': {
    header: '',
    delimiter: ',',
    hasHeader: true,
  },
}

function normalizeDemoCsv(filename: string, csvText: string): string {
  const config = DEMO_HEADERS[filename]
  if (!config || config.hasHeader) return csvText

  const trimmed = csvText.replace(/^\uFEFF/, '')
  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.toLowerCase() ?? ''
  const headerPrefix = config.header.split(config.delimiter)[0]?.toLowerCase() ?? ''

  if (headerPrefix && firstLine.includes(headerPrefix)) return trimmed
  return `${config.header}\n${trimmed}`
}

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const processFile = async (f: File) => {
    setLoading(true)
    setError('')
    try {
      const res = await uploadDataset(f)
      const state: ConfigureState = {
        fileId: res.file_id,
        columns: res.columns,
        autoDetectedSensitive: res.auto_detected_sensitive,
        fileName: f.name,
      }
      navigate('/configure', { state })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    await processFile(file)
  }

  const handleDemo = async (dataset: typeof DEMO_DATASETS[0]) => {
    setDemoLoading(dataset.name)
    setError('')
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBase}/proxy-dataset?url=${encodeURIComponent(dataset.url)}`)
      if (!response.ok) throw new Error('Failed to fetch demo dataset')
      const rawText = await response.text()
      const csvText = normalizeDemoCsv(dataset.filename, rawText)
      const demoFile = new File([csvText], dataset.filename, { type: 'text/csv' })
      await processFile(demoFile)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load demo dataset')
    } finally {
      setDemoLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <ShieldCheck className="w-4 h-4" />
            Unbias AI is the safest AI
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Fair<span className="text-indigo-600">Lens</span>
          </h1>
          <p className="mt-4 text-xl text-slate-500 font-medium">Make AI fair — one dataset at a time</p>
          <p className="mt-4 text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Upload any CSV dataset and get a complete AI fairness audit in seconds. Detect bias, understand its impact, and apply mitigation techniques — no data science expertise required.
          </p>
        </div>
      </section>

      {/* Upload */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Your Dataset</h2>
          <p className="text-sm text-slate-500 mb-6">CSV format · Maximum 10MB</p>
          <FileUpload onFile={setFile} />

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          {user ? (
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart2 className="w-5 h-5" />}
              {loading ? 'Uploading...' : 'Start Bias Audit'}
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Sign In to Start Audit
            </button>
          )}
        </div>
      </section>

      {/* Demo Datasets */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="text-lg font-bold text-slate-900 mb-2 text-center">Try with Demo Datasets</h2>
        <p className="text-sm text-slate-500 text-center mb-6">Real-world datasets with documented bias — ready to audit instantly</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {DEMO_DATASETS.map(d => (
            <div key={d.name} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="font-semibold text-slate-900 text-sm">{d.name}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{d.description}</p>
              <p className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg font-medium">{d.bias}</p>
              {user ? (
                <button
                  onClick={() => handleDemo(d)}
                  disabled={!!demoLoading || loading}
                  className="mt-auto w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  {demoLoading === d.name ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {demoLoading === d.name ? 'Loading...' : 'Audit This Dataset'}
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-auto w-full border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  Sign In to Audit
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: ShieldCheck, title: 'Bias Detection', desc: 'Fairlearn metrics + manual Disparate Impact and Mean Difference calculations' },
            { icon: Eye, title: 'Proxy Features', desc: 'Chi-squared detection of hidden bias encoded in non-sensitive columns' },
            { icon: BarChart2, title: 'AI Audit Report', desc: 'Plain-language Gemini 2.5 Flash report with severity rating and mitigation steps' },
          ].map(f => (
            <div key={f.title} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <f.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="font-semibold text-slate-900">{f.title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
