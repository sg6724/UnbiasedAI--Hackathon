import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type AuditRow = Database['public']['Tables']['audit_history']['Row']

const verdictColors = {
  biased:     'bg-red-100 text-red-700',
  borderline: 'bg-amber-100 text-amber-700',
  fair:       'bg-green-100 text-green-700',
}

export default function AuditHistory({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('audit_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [userId])

  if (loading) return <div className="text-sm text-slate-400">Loading history...</div>
  if (!rows.length) return <div className="text-sm text-slate-400">No audits saved yet.</div>

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="border border-slate-200 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-900 text-sm truncate">{row.file_name}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${verdictColors[row.verdict as keyof typeof verdictColors] ?? 'bg-slate-100 text-slate-600'}`}>
              {row.verdict.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sensitive: <span className="font-medium">{row.sensitive_col}</span> · Target: <span className="font-medium">{row.target_col}</span>
          </p>
          <p className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
