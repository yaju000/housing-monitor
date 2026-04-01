import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatPrice(value) {
  return `${(value / 10000).toFixed(0)} 萬`
}

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706']

export default function PriceTrendChart({ datasets }) {
  // datasets: [{ label, transactions: [{transaction_date, unit_price_per_ping}] }]
  if (!datasets || datasets.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">無成交資料</div>
  }

  // Build unified x-axis from all dates
  const allDates = [...new Set(
    datasets.flatMap(d => d.transactions.map(t => t.transaction_date))
  )].sort()

  const chartData = allDates.map(date => {
    const point = { date: formatDate(date) }
    datasets.forEach(ds => {
      const tx = ds.transactions.find(t => t.transaction_date === date)
      point[ds.label] = tx?.unit_price_per_ping ?? null
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatPrice} tick={{ fontSize: 11 }} width={60} />
        <Tooltip formatter={(v) => v ? `${formatPrice(v)}/坪` : '無資料'} />
        {datasets.length > 1 && <Legend />}
        {datasets.map((ds, i) => (
          <Line
            key={ds.label}
            type="monotone"
            dataKey={ds.label}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
