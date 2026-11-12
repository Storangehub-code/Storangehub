import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Followups({ clinics = [], session }) {
  const [followups, setFollowups] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewingDay, setViewingDay] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    clinic_id: '',
    date: '',
    time: '',
    type: 'Call',
    notes: '',
    warn: '1 hour'
  })

  useEffect(() => {
    loadFollowups()
  }, [])

  async function loadFollowups() {
    const { data } = await supabase.from('followups').select('*, clinics(name)').order('date')
    setFollowups(data || [])
  }

  async function addFollowup() {
    if (!form.clinic_id || !form.date) return alert('Clinic and date are required')
    const { error } = await supabase.from('followups').insert({
      clinic_id: form.clinic_id,
      date: form.date,
      time: form.time,
      type: form.type,
      notes: form.notes,
      warn: form.warn,
      user_id: session?.user?.id
    })
    if (error) return alert(error.message)
    setShowAdd(false)
    setForm({ clinic_id: '', date: '', time: '', type: 'Call', notes: '', warn: '1 hour' })
    loadFollowups()
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  function getFollowupsForDay(day) {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return followups.filter(f => f.date === dateStr)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>←</button>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>→</button>
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add Follow-up</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', padding: 8 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day, i) => {
          const dayFollowups = getFollowupsForDay(day)
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString()
          return (
            <div
              key={i}
              onClick={() => day && setViewingDay(day)}
              style={{
                minHeight: 90,
                background: '#111827',
                border: isToday ? '2px solid #14b8a6' : '1px solid #1f2937',
                borderRadius: 6,
                padding: 6,
                cursor: day ? 'pointer' : 'default',
                opacity: day ? 1 : 0.3
              }}
            >
              {day && <div style={{ fontWeight: 600, marginBottom: 4 }}>{day}</div>}
              {dayFollowups.slice(0, 3).map(f => (
                <div key={f.id} style={{ fontSize: 11, background: '#0d9488', color: 'white', borderRadius: 3, padding: '2px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.time || ''} {f.clinics?.name || 'Follow-up'}
                </div>
              ))}
              {dayFollowups.length > 3 && <div style={{ fontSize: 10, color: '#9ca3af' }}>+{dayFollowups.length - 3} more</div>}
            </div>
          )
        })}
      </div>

      {viewingDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setViewingDay(null)}>
          <div style={{ background: '#111827', padding: 24, borderRadius: 12, width: 400, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Follow-ups on {viewingDay}</h3>
            {getFollowupsForDay(viewingDay).map(f => (
              <div key={f.id} style={{ padding: 12, background: '#0b1220', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{f.clinics?.name || 'Unknown'}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{f.time || 'No time'} · {f.type}</div>
                {f.notes && <div style={{ fontSize: 13, marginTop: 4 }}>{f.notes}</div>}
                <button className="btn secondary" style={{ marginTop: 8, padding: '4px 8px', fontSize: 12 }} onClick={async () => {
                  await supabase.from('followups').delete().eq('id', f.id)
                  loadFollowups()
                }}>Delete</button>
              </div>
            ))}
            {!getFollowupsForDay(viewingDay).length && <p style={{ color: '#6b7280' }}>No follow-ups this day.</p>}
            <button className="btn secondary" onClick={() => setViewingDay(null)} style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#111827', padding: 24, borderRadius: 12, width: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Follow-up</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Clinic</label>
              <select value={form.clinic_id} onChange={e => setForm({ ...form, clinic_id: e.target.value })} style={{ width: '100%', padding: 8, background: '#0b1220', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6 }}>
                <option value="">Select clinic...</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9ca3af' }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9ca3af' }}>Time</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: 8 }}>
                <option>Call</option>
                <option>Visit</option>
                <option>Meeting</option>
                <option>Email</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: '100%', padding: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn" onClick={addFollowup}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
