import { XCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import type { Verdict } from '@/types/fairlens'

const config = {
  biased: {
    bg: 'bg-red-600',
    text: 'BIASED',
    sub: 'Significant bias detected in this model',
    icon: XCircle,
  },
  borderline: {
    bg: 'bg-amber-500',
    text: 'BORDERLINE',
    sub: 'Potential bias detected — review recommended',
    icon: AlertTriangle,
  },
  fair: {
    bg: 'bg-green-600',
    text: 'FAIR',
    sub: 'No significant bias detected',
    icon: CheckCircle,
  },
}

export default function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const c = config[verdict]
  const Icon = c.icon
  return (
    <div className={`${c.bg} text-white rounded-2xl px-8 py-6 flex items-center gap-4 shadow-lg`}>
      <Icon className="w-10 h-10 shrink-0" />
      <div>
        <p className="text-3xl font-black tracking-wide">{c.text}</p>
        <p className="text-white/80 text-sm mt-0.5">{c.sub}</p>
      </div>
    </div>
  )
}
