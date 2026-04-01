import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function ProjectCard({ project }) {
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()
  const watching = isWatching(project.id)
  const inCompare = isInCompare(project.id)

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <Link to={`/project/${project.id}`} className="text-blue-700 font-semibold hover:underline">
          {project.name}
        </Link>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {project.status || '—'}
        </span>
      </div>
      <p className="text-sm text-gray-500">{project.city}{project.district} {project.address || ''}</p>
      {project.building_type && (
        <p className="text-xs text-gray-400">{project.building_type}</p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => watching ? removeFromWatchlist(project.id) : addToWatchlist(project)}
          className={`text-xs px-3 py-1 rounded border ${watching ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          {watching ? '★ 追蹤中' : '☆ 追蹤'}
        </button>
        <button
          onClick={() => inCompare ? removeFromCompare(project.id) : addToCompare(project)}
          disabled={!inCompare && compareList.length >= 4}
          className={`text-xs px-3 py-1 rounded border ${inCompare ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40'}`}
        >
          {inCompare ? '✓ 比較中' : '+ 比較'}
        </button>
      </div>
    </div>
  )
}
