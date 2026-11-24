import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NotificationBell({ userId, onOpen, onBellClick }) {
  const [notes, setNotes] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    load()
    const channel = supabase.channel('notes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function load() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    setNotes(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    load()
  }

  const unread = notes.filter(n => !n.read).length

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { if (onBellClick) onBellClick(); else setOpen(!open) }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: 20, color: '#9ca3af' }}>
        🔔
        {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 36, width: 320, maxHeight: 400, overflow: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #334155', fontWeight: 600 }}>Notifications</div>
          {notes.length === 0 && <div style={{ padding: 16, color: '#6b7280' }}>No notifications</div>}
          {notes.map(n => (
            <div key={n.id} onClick={() => { markRead(n.id); if (onOpen && n.clinic_id) onOpen(n); setOpen(false) }}
              style={{ padding: '10px 12px', borderBottom: '1px solid #1f2937', cursor: 'pointer', background: n.read ? 'transparent' : '#0f172a' }}>
              <div style={{ fontSize: 13 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
