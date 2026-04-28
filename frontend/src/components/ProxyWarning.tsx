import { AlertTriangle } from 'lucide-react'
import type { ProxyFeature } from '@/types/fairlens'

interface Props {
  proxyFeatures: ProxyFeature[]
  sensitiveCol: string
}

export default function ProxyWarning({ proxyFeatures, sensitiveCol }: Props) {
  if (!proxyFeatures.length) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900">Proxy Features Detected</p>
          <p className="text-sm text-amber-700 mt-1">
            These columns are statistically correlated with <strong>{sensitiveCol}</strong> and may encode hidden bias even if the sensitive attribute is excluded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {proxyFeatures.map(f => (
              <div key={f.column} className="bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-semibold text-amber-800">{f.column}</span>
                <span className="text-amber-600 ml-2">χ²={f.chi2.toFixed(1)}, p={f.p_value.toExponential(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
