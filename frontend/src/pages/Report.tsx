import { useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Download, ChevronLeft, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import Navbar from '@/components/Navbar'
import type { ResultsState } from '@/types/fairlens'

function getSeverity(report: string, verdict: string): { level: string; color: string } {
  const upper = report.toUpperCase()
  if (upper.includes('SEVERITY: CRITICAL')) return { level: 'Critical', color: 'bg-red-100 text-red-800' }
  if (upper.includes('SEVERITY: HIGH') || verdict === 'biased') return { level: 'High', color: 'bg-red-100 text-red-800' }
  if (upper.includes('SEVERITY: MEDIUM') || verdict === 'borderline') return { level: 'Medium', color: 'bg-amber-100 text-amber-800' }
  return { level: 'Low', color: 'bg-green-100 text-green-800' }
}

const SeverityIcon = ({ level }: { level: string }) => {
  if (level === 'Critical' || level === 'High') return <XCircle className="w-4 h-4" />
  if (level === 'Medium') return <AlertTriangle className="w-4 h-4" />
  return <CheckCircle className="w-4 h-4" />
}

export default function Report() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ResultsState | null
  const reportRef = useRef<HTMLDivElement>(null)

  if (!state) { navigate('/'); return null }

  const { analyzeResult, fileName, sensitiveCol, targetCol } = state
  const { report, verdict, metrics, warnings = [] } = analyzeResult
  const severity = getSeverity(report, verdict)

  const cleanReport = report.replace(/SEVERITY:\s*\w+/gi, '').trim()
  const paragraphs = cleanReport.split(/\n\n+/).filter(Boolean)

  const byGroup = metrics.by_group ?? {}
  const groupEntries = Object.entries(byGroup)

  const downloadPDF = async () => {
    const el = reportRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const ratio = canvas.width / canvas.height
    const imgHeight = pageWidth / ratio
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save('fairlens-audit-report.pdf')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Results
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Audit Report</h1>
            <p className="text-sm text-slate-500 mt-1">{fileName} · {sensitiveCol} → {targetCol}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${severity.color}`}>
            <SeverityIcon level={severity.level} />
            SEVERITY: {severity.level.toUpperCase()}
          </span>
        </div>

        {/* Pipeline warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Pipeline Warnings ({warnings.length})
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700 leading-relaxed pl-6">{w}</p>
            ))}
          </div>
        )}

        {/* Scalar metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'DPD', value: metrics.demographic_parity_difference.toFixed(3), hint: 'ideal: 0' },
            { label: 'DIR', value: metrics.disparate_impact_ratio.toFixed(3), hint: 'ideal: 1' },
            { label: 'EOD', value: metrics.equalized_odds_difference.toFixed(3), hint: 'ideal: 0' },
            { label: 'MD',  value: metrics.mean_difference.toFixed(3), hint: 'ideal: 0' },
          ].map(m => (
            <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 font-medium">{m.label}</p>
              <p className="text-xl font-black text-slate-900 tabular-nums mt-0.5">{m.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.hint}</p>
            </div>
          ))}
        </div>

        {/* Fix #12: Group-level transparency table */}
        {groupEntries.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900">Group-Level Statistics</h2>
              <span className="text-xs text-slate-400">({sensitiveCol})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 text-slate-500 font-medium">Group</th>
                    <th className="text-right py-2 pr-4 text-slate-500 font-medium">Count</th>
                    <th className="text-right py-2 pr-4 text-slate-500 font-medium">Pos. Pred. Rate</th>
                    <th className="text-right py-2 pr-4 text-slate-500 font-medium">Accuracy</th>
                    <th className="text-right py-2 text-slate-500 font-medium">TPR</th>
                  </tr>
                </thead>
                <tbody>
                  {groupEntries.map(([group, stats]) => {
                    const ppr = stats.positive_prediction_rate ?? stats.selection_rate ?? 0
                    const maxPPR = Math.max(...groupEntries.map(([, s]) => s.positive_prediction_rate ?? s.selection_rate ?? 0))
                    const isLowest = groupEntries.length > 1 && ppr === Math.min(...groupEntries.map(([, s]) => s.positive_prediction_rate ?? s.selection_rate ?? 0)) && ppr < maxPPR
                    return (
                      <tr key={group} className="border-b border-slate-50 last:border-0">
                        <td className={`py-2 pr-4 font-medium ${isLowest ? 'text-red-600' : 'text-slate-800'}`}>
                          {group}{isLowest && <span className="ml-1 text-red-400 text-xs">↓ lowest</span>}
                        </td>
                        <td className="text-right py-2 pr-4 text-slate-600 tabular-nums">{stats.count}</td>
                        <td className={`text-right py-2 pr-4 tabular-nums font-semibold ${isLowest ? 'text-red-600' : 'text-slate-700'}`}>
                          {(ppr * 100).toFixed(1)}%
                        </td>
                        <td className="text-right py-2 pr-4 text-slate-600 tabular-nums">{((stats.accuracy ?? 0) * 100).toFixed(1)}%</td>
                        <td className="text-right py-2 text-slate-600 tabular-nums">{((stats.tpr ?? 0) * 100).toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Report */}
        <div ref={reportRef} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="border-b border-slate-100 pb-4 mb-2">
            <h2 className="text-lg font-bold text-slate-900">FairLens Bias Audit Report</h2>
            <p className="text-sm text-slate-500 mt-1">Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {paragraphs.map((para, i) => {
            const isRecommendation = para.match(/^\s*\d+\.|^Recommendation/i)
            return (
              <p key={i} className={`leading-relaxed ${isRecommendation ? 'text-slate-700 bg-slate-50 px-4 py-2 rounded-lg text-sm' : 'text-slate-600'}`}>
                {para}
              </p>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
