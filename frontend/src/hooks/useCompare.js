import { useState, useEffect } from 'react'

const STORAGE_KEY = 'housing_compare'
const MAX_COMPARE = 4

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useCompare() {
  const [compareList, setCompareList] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareList))
  }, [compareList])

  const isInCompare = (projectId) => compareList.some(p => p.id === projectId)

  const addToCompare = (project) => {
    if (isInCompare(project.id)) return
    if (compareList.length >= MAX_COMPARE) return
    setCompareList(prev => [...prev, { id: project.id, name: project.name }])
  }

  const removeFromCompare = (projectId) => {
    setCompareList(prev => prev.filter(p => p.id !== projectId))
  }

  const clearCompare = () => setCompareList([])

  return { compareList, isInCompare, addToCompare, removeFromCompare, clearCompare }
}
