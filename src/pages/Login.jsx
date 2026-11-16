import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      setMessage(error ? error.message : 'Check your email to confirm.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Response DX CRM</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 12 }} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 12 }} required />
        <button className="btn" type="submit" style={{ width: '100%' }}>{isSignUp ? 'Sign Up' : 'Log In'}</button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <span style={{ cursor: 'pointer', color: '#14b8a6' }} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
        </span>
      </p>
      {message && <p style={{ marginTop: 12, color: '#f59e0b' }}>{message}</p>}
    </div>
  )
}
