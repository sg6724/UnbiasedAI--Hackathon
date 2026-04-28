import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

interface Props {
  label: string
  value: number
  description: string
  status: 'pass' | 'borderline' | 'fail'
  ideal: string
  higherIsBetter?: boolean
}

const statusConfig = {
  pass:       { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',  icon: CheckCircle2,   label: 'PASS' },
  borderline: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',  icon: AlertTriangle,  label: 'BORDERLINE' },
  fail:       { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',      icon: XCircle,        label: 'FAIL' },
}

export default function MetricCard({ label, value, description, status, ideal }: Props) {
  const s = statusConfig[status]
  const Icon = s.icon
  return (
    <div className={`${s.bg} ${s.border} border rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700 leading-tight">{label}</p>
        <span className={`${s.badge} text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0`}>
          <Icon className="w-3 h-3" />
          {s.label}
        </span>
      </div>
      <p className="text-4xl font-black text-slate-900 tabular-nums">{value.toFixed(3)}</p>
      <div className="space-y-1">
        <p className="text-xs text-slate-500">{description}</p>
        <p className="text-xs text-slate-400">Ideal: <span className="font-medium text-slate-600">{ideal}</span></p>
      </div>
    </div>
  )
}
