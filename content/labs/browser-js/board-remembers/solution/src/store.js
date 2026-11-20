const KEY = 'gritstone-ticks'

export function loadTicks() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export function saveTicks(ticked) {
  localStorage.setItem(KEY, JSON.stringify([...ticked]))
}
