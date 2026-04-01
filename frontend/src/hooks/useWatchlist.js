import { useState, useEffect } from 'react'

const STORAGE_KEY = 'housing_watchlist'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const isWatching = (projectId) => watchlist.some(w => w.project_id === projectId)

  const addToWatchlist = (project) => {
    if (isWatching(project.id)) return
    setWatchlist(prev => [...prev, {
      project_id: project.id,
      name: project.name,
      added_at: new Date().toISOString(),
    }])
  }

  const removeFromWatchlist = (projectId) => {
    setWatchlist(prev => prev.filter(w => w.project_id !== projectId))
  }

  return { watchlist, isWatching, addToWatchlist, removeFromWatchlist }
}
