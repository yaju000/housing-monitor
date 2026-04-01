import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function Watchlist() {
  const { watchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, compareList } = useCompare()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
      <div className="flex items-center justify-between mt-1 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的追蹤清單</h1>
        {compareList.length > 0 && (
          <Link to="/compare" className="text-sm text-green-600 hover:underline">
            前往比較（{compareList.length}）
          </Link>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="text-gray-400 py-16 text-center">
          <p>尚未追蹤任何建案</p>
          <Link to="/search" className="mt-2 inline-block text-blue-600 hover:underline">去搜尋建案</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {watchlist.map(item => (
            <div key={item.project_id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4">
              <div>
                <Link
                  to={`/project/${item.project_id}`}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  加入時間：{new Date(item.added_at).toLocaleDateString('zh-TW')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addToCompare({ id: item.project_id, name: item.name })}
                  disabled={isInCompare(item.project_id) || compareList.length >= 4}
                  className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  {isInCompare(item.project_id) ? '✓ 比較中' : '+ 比較'}
                </button>
                <button
                  onClick={() => removeFromWatchlist(item.project_id)}
                  className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
