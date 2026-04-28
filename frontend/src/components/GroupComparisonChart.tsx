import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { GroupMetrics } from '@/types/fairlens'

interface Props {
  byGroup: Record<string, GroupMetrics>
}

export default function GroupComparisonChart({ byGroup }: Props) {
  const data = Object.entries(byGroup).map(([group, m]) => ({
    group: String(group),
    'Selection Rate': parseFloat((m.selection_rate * 100).toFixed(1)),
    'Accuracy': parseFloat((m.accuracy * 100).toFixed(1)),
    'TPR': parseFloat((m.tpr * 100).toFixed(1)),
  }))

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="group" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Selection Rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="TPR" fill="#14b8a6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
