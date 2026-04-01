import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DISTRICTS = ['大安區','信義區','中正區','松山區','內湖區','士林區','北投區','中山區','文山區','南港區','萬華區','大同區']
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
