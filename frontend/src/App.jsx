import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Search from './pages/Search'
import ProjectDetail from './pages/ProjectDetail'
import Compare from './pages/Compare'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/watchlist" element={<Watchlist />} />
      </Routes>
    </div>
  )
}
