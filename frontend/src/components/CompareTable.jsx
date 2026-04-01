import { Link } from 'react-router-dom'
import PriceTrendChart from './PriceTrendChart'

function Row({ label, values }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-sm text-gray-500 font-medium bg-gray-50 whitespace-nowrap">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-sm text-center">{v ?? '—'}</td>
      ))}
    </tr>
  )
}

export default function CompareTable({ projects, transactionsMap }) {
  if (projects.length === 0) return <p className="text-gray-400">尚未加入任何比較物件</p>

  const avgPrice = (id) => {
    const txs = transactionsMap[id] || []
    const prices = txs.map(t => t.unit_price_per_ping).filter(Boolean)
    if (!prices.length) return null
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    return `${(avg / 10000).toFixed(1)} 萬/坪`
  }

  const datasets = projects.map(p => ({
    label: p.name,
    transactions: transactionsMap[p.id] || [],
  }))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-50 text-left text-sm text-gray-500">項目</th>
              {projects.map(p => (
                <th key={p.id} className="px-3 py-2 text-center text-sm">
                  <Link to={`/project/${p.id}`} className="text-blue-700 hover:underline">{p.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="城市" values={projects.map(p => p.city)} />
            <Row label="行政區" values={projects.map(p => p.district)} />
            <Row label="建物類型" values={projects.map(p => p.building_type)} />
            <Row label="狀態" values={projects.map(p => p.status)} />
            <Row label="總樓層" values={projects.map(p => p.total_floors ? `${p.total_floors} 層` : null)} />
            <Row label="成交均價" values={projects.map(p => avgPrice(p.id))} />
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold mb-2">成交價格走勢比較</h3>
        <PriceTrendChart datasets={datasets} />
      </div>
    </div>
  )
}
