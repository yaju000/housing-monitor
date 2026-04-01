import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import ProjectCard from '../components/ProjectCard'
import { searchProjects } from '../api/client'
import { useCompare } from '../hooks/useCompare'

export default function Search() {
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { compareList } = useCompare()

  const q = searchParams.get('q') || ''
  const district = searchParams.get('district') || ''
  const status = searchParams.get('status') || ''

  useEffect(() => {
    setLoading(true)
    setError(null)
    searchProjects({ q, district, status })
      .then(setProjects)
      .catch(() => setError('載入失敗，請稍後再試'))
      .finally(() => setLoading(false))
  }, [q, district, status])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
        {compareList.length > 0 && (
          <Link to="/compare" className="ml-4 text-sm text-green-600 hover:underline">
            前往比較（{compareList.length}）
          </Link>
        )}
      </div>
      <div className="mb-6">
        <SearchBar defaultValues={{ q, district, status }} />
      </div>
      {loading && <p className="text-gray-500">搜尋中...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-400">找不到符合條件的建案</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  )
}
