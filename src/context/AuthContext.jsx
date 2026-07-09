import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user)
      else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(authUser) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', authUser.id)
      .single()

    // First sign-in after email confirmation: no profiles row exists yet
    // (signUp() can't insert one itself since it runs unauthenticated until
    // the user confirms). Create it now from the metadata stashed at signup.
    if (!data) {
      const meta = authUser.user_metadata ?? {}
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: authUser.id, full_name: meta.full_name ?? null, role: meta.role ?? 'sales' })
        .select('role, full_name')
        .single()
      setRole(created?.role ?? 'sales')
      setDisplayName(created?.full_name ?? null)
      setLoading(false)
      return
    }

    setRole(data.role ?? 'sales')
    setDisplayName(data.full_name ?? null)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, fullName, role) {
    // No session exists yet at this point if email confirmation is required,
    // so the profiles row can't be inserted here (RLS requires auth.uid()).
    // Stash name/role in user_metadata instead; fetchRole() creates the row
    // on first authenticated sign-in.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    })
    if (error) return { error }

    return { error: null, needsEmailConfirmation: !data.session }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, displayName, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)