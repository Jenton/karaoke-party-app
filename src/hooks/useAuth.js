import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Sign-in for editing the song library (only used when the database is configured).
export function useAuth() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : ''
  }, [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { enabled: !!supabase, session, signIn, signOut }
}
