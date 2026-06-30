import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'salesperson'
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  // admin: which user's data to view
  viewingAs: Profile | null
  setViewingAs: (p: Profile | null) => void
  allProfiles: Profile[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingAs, setViewingAs] = useState<Profile | null>(null)

  const fetchProfile = async (u: User): Promise<Profile | null> => {
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (data) return data as Profile
    // first login — create profile
    const newProfile = {
      id: u.id,
      name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      email: u.email || '',
      avatar: u.user_metadata?.avatar_url || '',
      role: 'salesperson' as const
    }
    await supabase.from('profiles').insert(newProfile)
    return newProfile
  }

  const fetchAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    if (data) setAllProfiles(data as Profile[])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user)
        setProfile(p)
        if (p?.role === 'admin') await fetchAllProfiles()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user)
        setProfile(p)
        if (p?.role === 'admin') await fetchAllProfiles()
      } else {
        setProfile(null)
        setAllProfiles([])
        setViewingAs(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signInWithGoogle, signOut, viewingAs, setViewingAs, allProfiles }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
