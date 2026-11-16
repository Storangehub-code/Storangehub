import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Detect if this is a company CRM site
  const hostname = window.location.hostname
  const isCompanySite = 
    hostname.endsWith('.storangehub.com') && 
    hostname !== 'storangehub.com' && 
    hostname !== 'www.storangehub.com'
  const isCrmMode = import.meta.env.VITE_APP_MODE === 'crm'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  // Company CRM sites: skip marketing, go to login or dashboard
  if (isCompanySite || isCrmMode) {
    if (!session) return <Login />
    return <Dashboard session={session} />
  }

  // Main marketing site (storangehub.com)
  return (
    <div style={{ padding: '2rem', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h1>Marketing Site</h1>
      <p>Main site home</p>
    </div>
  )
}