import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type AuditRow = Database['public']['Tables']['audit_history']['Row']

const VERDICT_COLORS = {
  biased: '#ef4444',
  borderline: '#f59e0b',
  fair: '#22c55e',
}

const VERDICT_BADGE: Record<string, string> = {
  biased: 'bg-red-100 text-red-700',
  borderline: 'bg-amber-100 text-amber-700',
  fair: 'bg-green-100 text-green-700',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/'); return }
      setUserEmail(data.user.email ?? '')
      supabase
        .from('audit_history')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data: auditRows }) => {
          setRows(auditRows ?? [])
          setLoading(false)
        })
    })
  }, [navigate])

  const stats = useMemo(() => ({
    total: rows.length,
    biased: rows.filter(r => r.verdict === 'biased').length,
    borderline: rows.filter(r => r.verdict === 'borderline').length,
    fair: rows.filter(r => r.verdict === 'fair').length,
  }), [rows])

  const donutData = useMemo(() => [
    { name: 'Biased', value: stats.biased, color: VERDICT_COLORS.biased },
    { name: 'Borderline', value: stats.borderline, color: VERDICT_COLORS.borderline },
    { name: 'Fair', value: stats.fair, color: VERDICT_COLORS.fair },
  ].filter(d => d.value > 0), [stats])

  const trendData = useMemo(() =>
    [...rows].reverse().map(r => ({
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dpd: typeof r.metrics === 'object' && r.metrics !== null
        ? ((r.metrics as Record<string, unknown>).demographic_parity_difference as number ?? 0)
        : 0,
    })), [rows])

  const attrData = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.sensitive_col] = (acc[r.sensitive_col] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [rows])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {userEmail}</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Audits', value: stats.total, Icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Biased', value: stats.biased, Icon: XCircle, color: 'text-red-600 bg-red-50' },
            { label: 'Borderline', value: stats.borderline, Icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Fair', value: stats.fair, Icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-600">No audits yet</p>
            <p className="text-sm text-slate-400 mt-1">Upload a dataset on the home page to run your first bias audit.</p>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">Verdict Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Demographic Parity Trend</h2>
                <p className="text-xs text-slate-400 mb-4">Lower is fairer · ideal = 0</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <ReTooltip />
                    <Line
                      type="monotone"
                      dataKey="dpd"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="DPD"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensitive attributes bar chart */}
            {attrData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Most Audited Sensitive Attributes</h2>
                <p className="text-xs text-slate-400 mb-4">Number of audits per attribute</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Audits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Audit history table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Audit History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">File</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Verdict</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Sensitive</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Target</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Model</th>
                      <th className="px-6 py-3 text-left font-medium text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900 max-w-[180px] truncate">{row.file_name}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${VERDICT_BADGE[row.verdict] ?? 'bg-slate-100 text-slate-600'}`}>
                            {row.verdict.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{row.sensitive_col}</td>
                        <td className="px-6 py-3 text-slate-600">{row.target_col}</td>
                        <td className="px-6 py-3 text-slate-500 capitalize">{row.model_type.replace('_', ' ')}</td>
                        <td className="px-6 py-3 text-slate-400">{new Date(row.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
