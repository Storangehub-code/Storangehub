import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_LABELS = {
  activity: 'Activity',
  account_edit: 'Account Edit',
  account_approved: 'Account Approved',
  supply_order: 'Supply Order',
  pickup: 'Pickup',
  new_clinic: 'New Clinic',
  new_doctor: 'New Doctor',
  expense: 'Expense',
  note: 'Note',
}

export default function Notifications({ userId, clinics = [], onOpenClinic }) {
  const [notes, setNotes] = useState([])
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotes(notes.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function deleteOne(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
    setSelected(selected.filter(s => s !== id))
  }

  async function deleteSelected() {
    if (!selected.length) return
    if (!confirm(`Delete ${selected.length} notification${selected.length > 1 ? 's' : ''}?`)) return
    await supabase.from('notifications').delete().in('id', selected)
    setNotes(notes.filter(n => !selected.includes(n.id)))
    setSelected([])
  }

  async function markAllRead() {
    const unread = notes.filter(n => !n.read).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notifications').update({ read: true }).in('id', unread)
    setNotes(notes.map(n => ({ ...n, read: true })))
  }

  const types = [...new Set(notes.map(n => n.type).filter(Boolean))]
  let filtered = notes.filter(n => filter === 'all' || n.type === filter)
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at), db = new Date(b.created_at)
    return sort === 'newest' ? db - da : da - db
  })

  function toggleSelect(id) {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  function toggleAll() {
    if (selected.length === filtered.length) setSelected([])
    else setSelected(filtered.map(n => n.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 12, color: '#9ca3af', marginRight: 6 }}>Type</label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#9ca3af', marginRight: 6 }}>Sort</label>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={markAllRead}>Mark all read</button>
          {selected.length > 0 && (
            <button className="btn" style={{ background: '#ef4444' }} onClick={deleteSelected}>Delete selected ({selected.length})</button>
          )}
        </div>
      </div>

      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
      {!loading && filtered.length === 0 && <div style={{ color: '#6b7280', padding: 24 }}>No notifications</div>}

      {!loading && filtered.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1f2937', fontSize: 12, color: '#6b7280' }}>
            <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ marginRight: 12 }} />
            <span style={{ flex: 2 }}>Message</span>
            <span style={{ flex: 1 }}>Type</span>
            <span style={{ width: 160 }}>Date</span>
            <span style={{ width: 80 }}></span>
          </div>
          {filtered.map(n => {
            const clinic = clinics.find(c => c.id === n.clinic_id)
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1f2937', background: n.read ? 'transparent' : '#0f172a' }}>
                <input type="checkbox" checked={selected.includes(n.id)} onChange={() => toggleSelect(n.id)} style={{ marginRight: 12 }} />
                <div style={{ flex: 2, cursor: clinic ? 'pointer' : 'default' }} onClick={() => { if (!n.read) markRead(n.id); if (clinic && onOpenClinic) onOpenClinic(clinic) }}>
                  <div style={{ fontSize: 14 }}>{n.message}</div>
                  {clinic && <div style={{ fontSize: 11, color: '#14b8a6', marginTop: 2 }}>{clinic.name}</div>}
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#9ca3af' }}>{TYPE_LABELS[n.type] || n.type || '—'}</div>
                <div style={{ width: 160, fontSize: 12, color: '#6b7280' }}>{new Date(n.created_at).toLocaleString()}</div>
                <div style={{ width: 80, textAlign: 'right' }}>
                  <button className="btn secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => deleteOne(n.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
