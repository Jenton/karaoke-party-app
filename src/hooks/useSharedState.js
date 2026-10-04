import { useCallback, useEffect, useRef, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'
import { supabase } from '../lib/supabase.js'

const KEY = 'karaoke-party-state'
const empty = { queue: [], current: null }

function loadLocal() {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return empty
  }
}

// How the master copy of the party state is stored: the laptop's dev/preview server, or (on the public
// page) the shared Supabase database, so phones and the TV see the same queue from anywhere.
// localStorage is the fallback when neither is available.
const ROW = 'main'
const transport = HAS_SERVER
  ? {
      every: 1500,
      get: async () => {
        const r = await fetch('/api/state')
        if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error('offline')
        return r.json()
      },
      send: async (s) => (await fetch('/api/state', { method: 'POST', body: JSON.stringify(s) })).json(),
    }
  : supabase
    ? {
        every: 2500,
        get: async () => {
          const { data, error } = await supabase.from('party_state').select('state,rev').eq('id', ROW).maybeSingle()
          if (error) throw error
          return data ? { rev: data.rev, ...data.state } : { rev: 0 }
        },
        send: async (s) => {
          const { data, error } = await supabase.from('party_state').upsert({ id: ROW, state: s }).select('rev').single()
          if (error) throw error
          return { rev: data.rev }
        },
      }
    : null

// Party state (current song + queue).
export function useSharedState() {
  const [state, setState] = useState(loadLocal)
  const stateRef = useRef(state)
  const rev = useRef(-1)
  const inFlight = useRef(0)
  const online = useRef(false)
  const lastChange = useRef(0) // when we last changed something locally

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
      const data = await transport.send(s)
      rev.current = Math.max(rev.current, data.rev)
    } catch {
      /* try again on next change */
    } finally {
      inFlight.current--
    }
  }, [])

  useEffect(() => {
    if (!transport) return
    let stop = false
    const tick = async () => {
      const requestedAt = Date.now()
      try {
        const data = await transport.get()
        online.current = true
        // skip snapshots that are older than a change we made while the request was in flight
        if (inFlight.current === 0 && data.rev !== rev.current && lastChange.current <= requestedAt) {
          const firstContact = rev.current === -1
          rev.current = data.rev
          if (firstContact && data.rev === 0) push(stateRef.current) // seed server with saved state
          else apply({ queue: data.queue ?? [], current: data.current ?? null })
        }
      } catch {
        online.current = false
      }
    }
    tick()
    const id = setInterval(() => !stop && tick(), transport.every)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [push])

  // update(fn): fn receives the latest state and returns the new one.
  const update = useCallback(
    (fn) => {
      lastChange.current = Date.now()
      const next = fn(stateRef.current)
      apply(next)
      push(next)
    },
    [push],
  )

  return [state, update]
}
