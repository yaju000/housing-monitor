import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DISTRICTS = ['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','仁德區','關廟區','新營區','鹽水區','白河區','柳營區','後壁區','東山區','麻豆區','下營區','六甲區','官田區','大內區','佳里區','西港區','七股區','將軍區','學甲區','北門區','善化區','新市區','安定區','山上區','玉井區','楠西區','南化區','左鎮區','龍崎區']
const STATUSES = ['預售', '新成屋', '中古屋']

export default function SearchBar({ defaultValues = {} }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(defaultValues.q || '')
  const [district, setDistrict] = useState(defaultValues.district || '')
  const [status, setStatus] = useState(defaultValues.status || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (district) params.set('district', district)
    if (status) params.set('status', status)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <input
        type="text"
        placeholder="搜尋建案名稱或地址..."
        value={q}
        onChange={e => setQ(e.target.value)}
        className="flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={district}
        onChange={e => setDistrict(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        <option value="">全部行政區</option>
        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        <option value="">全部類型</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
      >
        搜尋
      </button>
    </form>
  )
}
