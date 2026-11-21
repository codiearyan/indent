import { useEffect, useState } from 'react'

export function useStock() {
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    setStatus('loading')
    fetch('data/stock.json')
      .then((response) => {
        if (!response.ok) throw new Error(`The server answered ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (ignore) return
        setRecords(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!ignore) setStatus('failed')
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  return { records, status, retry: () => setAttempt((n) => n + 1) }
}
