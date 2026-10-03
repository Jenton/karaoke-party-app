import { useCallback, useEffect, useRef, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'

const KEY = 'karaoke-party-state'
const empty = { queue: [], current: null }

function loadLocal() {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return empty
  }
}

// Party state (current song + queue). The dev/preview server keeps the master copy so
// phones and the TV see the same queue; localStorage is the fallback (e.g. static hosting).
export function useSharedState() {
  const [state, setState] = useState(loadLocal)
  const stateRef = useRef(state)
  const rev = useRef(-1)
  const inFlight = useRef(0)
  const online = useRef(false)

  const apply = (s) => {
    stateRef.current = s
    setState(s)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }

  const push = useCallback(async (s) => {
    if (!online.current) return
    inFlight.current++
    try {
      const r = await fetch('/api/state', { method: 'POST', body: JSON.stringify(s) })
      const data = await r.json()
      rev.current = Math.max(rev.current, data.rev)
    } catch {
      /* try again on next change */
    } finally {
      inFlight.current--
    }
  }, [])

  useEffect(() => {
    if (!HAS_SERVER) return
    let stop = false
    const tick = async () => {
      try {
        const r = await fetch('/api/state')
        if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('offline')
        const data = await r.json()
        online.current = true
        if (inFlight.current === 0 && data.rev !== rev.current) {
          const firstContact = rev.current === -1
          rev.current = data.rev
          if (firstContact && data.rev === 0) push(stateRef.current) // seed server with saved state
          else apply({ queue: data.queue, current: data.current })
        }
      } catch {
        online.current = false
      }
    }
    tick()
    const id = setInterval(() => !stop && tick(), 1500)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [push])

  // update(fn): fn receives the latest state and returns the new one.
  const update = useCallback(
    (fn) => {
      const next = fn(stateRef.current)
      apply(next)
      push(next)
    },
    [push],
  )

  return [state, update]
}
