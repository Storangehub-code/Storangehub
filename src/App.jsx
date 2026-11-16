import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com'

  // Main marketing site (storangehub.com)
  if (!isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<iframe src="/marketing.html" style={{ width: '100%', height: '100vh', border: 'none' }} />} />
          <Route path="/login" element={<iframe src="/login.html" style={{ width: '100%', height: '100vh', border: 'none' }} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Response DX CRM
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
        <div style={{ background: '#111827', padding: 40, borderRadius: 12, width: 360 }}>
          <h2 style={{ marginBottom: 20 }}>Response DX Login</h2>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard session={session} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleLogin}>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 10 }} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 10 }} required />
      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
      <button type="submit" style={{ width: '100%', padding: 10, background: '#0d9488', color: 'white', border: 'none', borderRadius: 6 }}>Log In</button>
    </form>
  )
}

export default App