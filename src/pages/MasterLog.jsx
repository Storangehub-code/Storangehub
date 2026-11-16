import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MasterLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
    const interval = setInterval(loadLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadLogs() {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100)
    setLogs(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Activity Log <span style={{ fontSize: 12, color: '#6b7280' }}>(refreshes every 10s)</span></h3>
        {loading && <p>Loading...</p>}
        {!loading && !logs.length && <p style={{ color: '#6b7280' }}>No activity yet. Actions will appear here.</p>}
        <table style={{ fontSize: 13 }}>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_email || '—'}</td>
                <td>{l.action}</td>
                <td style={{ color: '#9ca3af' }}>{l.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
