import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, getTransactions, getListings, subscribeAlert } from '../api/client'
import ProjectMap from '../components/ProjectMap'
import PriceTrendChart from '../components/PriceTrendChart'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [listings, setListings] = useState([])
  const [alertEmail, setAlertEmail] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(3)
  const [alertSent, setAlertSent] = useState(false)
  const [loading, setLoading] = useState(true)

  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getProject(id),
      getTransactions(id),
      getListings(id),
    ]).then(([p, txs, lst]) => {
      setProject(p)
      setTransactions(txs)
      setListings(lst)
    }).finally(() => setLoading(false))
  }, [id])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    await subscribeAlert({ project_id: Number(id), email: alertEmail, threshold_percent: alertThreshold })
    setAlertSent(true)
  }

  if (loading) return <div className="p-8 text-gray-500">載入中...</div>
  if (!project) return <div className="p-8 text-red-500">找不到建案</div>

  const watching = isWatching(project.id)
  const inCompare = isInCompare(project.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/search" className="text-sm text-gray-500 hover:underline">← 搜尋結果</Link>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">{project.city}{project.district} {project.address}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {project.building_type && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{project.building_type}</span>}
            {project.status && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{project.status}</span>}
            {project.total_floors && <span className="text-xs text-gray-400">共 {project.total_floors} 層</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => watching ? removeFromWatchlist(project.id) : addToWatchlist(project)}
            className={`text-sm px-4 py-2 rounded border ${watching ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            {watching ? '★ 追蹤中' : '☆ 追蹤'}
          </button>
          <button
            onClick={() => inCompare ? removeFromCompare(project.id) : addToCompare(project)}
            disabled={!inCompare && compareList.length >= 4}
            className={`text-sm px-4 py-2 rounded border ${inCompare ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50 disabled:opacity-40'}`}
          >
            {inCompare ? '✓ 比較中' : '+ 加入比較'}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">地點與生活機能</h2>
        <ProjectMap lat={project.lat} lng={project.lng} projectName={project.name} />
      </div>

      {/* Price trend */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">成交走勢（時價登錄）</h2>
        <PriceTrendChart datasets={[{ label: project.name, transactions }]} />
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">物件列表</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">格局</th>
                  <th className="px-3 py-2 text-right">坪數</th>
                  <th className="px-3 py-2 text-right">樓層</th>
                  <th className="px-3 py-2 text-right">開價</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">{l.unit_type || '—'}</td>
                    <td className="px-3 py-2 text-right">{l.size_ping ? `${l.size_ping} 坪` : '—'}</td>
                    <td className="px-3 py-2 text-right">{l.floor ? `${l.floor} 樓` : '—'}</td>
                    <td className="px-3 py-2 text-right">{l.asking_price ? `${(l.asking_price / 10000).toFixed(0)} 萬` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email alert */}
      <div className="mt-8 bg-gray-50 rounded p-4">
        <h2 className="text-lg font-semibold mb-2">設定價格通知</h2>
        {alertSent ? (
          <p className="text-green-600">✓ 已設定！當價格變動超過 {alertThreshold}% 時，我們會通知你。</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-wrap gap-2 items-end">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            />
            <div className="flex items-center gap-1 text-sm">
              <span>變動超過</span>
              <input
                type="number"
                min="1"
                max="50"
                value={alertThreshold}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-2 w-16 text-center"
              />
              <span>% 時通知</span>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              設定通知
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
