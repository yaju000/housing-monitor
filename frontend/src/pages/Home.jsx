import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { useCompare } from '../hooks/useCompare'

export default function Home() {
  const { compareList } = useCompare()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">房價監測系統</h1>
      <p className="text-gray-500 mb-8">搜尋建案、追蹤價格、比較物件</p>
      <SearchBar />
      <div className="flex gap-4 mt-8 text-sm">
        <Link to="/watchlist" className="text-blue-600 hover:underline">我的追蹤清單</Link>
        {compareList.length > 0 && (
          <Link to="/compare" className="text-green-600 hover:underline">
            比較清單（{compareList.length}）
          </Link>
        )}
      </div>
    </div>
  )
}
