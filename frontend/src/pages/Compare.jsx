import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompare } from '../hooks/useCompare'
import { getProject, getTransactions } from '../api/client'
import CompareTable from '../components/CompareTable'

export default function Compare() {
  const { compareList, removeFromCompare, clearCompare } = useCompare()
  const [projects, setProjects] = useState([])
  const [transactionsMap, setTransactionsMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (compareList.length === 0) {
      setProjects([])
      setTransactionsMap({})
      return
    }
    setLoading(true)
    Promise.all(compareList.map(c => getProject(c.id)))
      .then(ps => {
        setProjects(ps)
        return Promise.all(ps.map(p => getTransactions(p.id).then(txs => [p.id, txs])))
      })
      .then(entries => setTransactionsMap(Object.fromEntries(entries)))
      .finally(() => setLoading(false))
  }, [compareList])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">建案比較</h1>
        </div>
        {compareList.length > 0 && (
          <button onClick={clearCompare} className="text-sm text-red-500 hover:underline">
            清空比較清單
          </button>
        )}
      </div>

      {compareList.length === 0 ? (
        <div className="text-gray-400 py-16 text-center">
          <p>尚未加入任何建案</p>
          <Link to="/search" className="mt-2 inline-block text-blue-600 hover:underline">去搜尋建案</Link>
        </div>
      ) : loading ? (
        <p className="text-gray-500">載入中...</p>
      ) : (
        <CompareTable projects={projects} transactionsMap={transactionsMap} />
      )}
    </div>
  )
}
