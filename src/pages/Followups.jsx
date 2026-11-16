import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Followups({ clinics = [], session }) {
  const [followups, setFollowups] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewingDay, setViewingDay] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
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
    const { data } = await supabase.from('followups').select('*, clinics(name)').order('scheduled_at')
    setFollowups(data || [])
  }

  async function saveFollowup() {
    if (!form.clinic_id || !form.date) return alert('Clinic and date are required')
    const scheduled_at = `${form.date}T${form.time || '09:00'}:00`
    const payload = {
      clinic_id: form.clinic_id,
      scheduled_at,
      followup_type: form.type,
      notes: form.notes,
      warn_before: form.warn
    }
    let error
    if (editing) {
      const res = await supabase.from('followups').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      const res = await supabase.from('followups').insert(payload)
      error = res.error
    }
    if (error) return alert(error.message)
    setShowAdd(false)
    setEditing(null)
    setForm({ clinic_id: '', date: '', time: '', type: 'Call', notes: '', warn: '1 hour' })
    loadFollowups()
  }

  function editFollowup(f) {
    const dt = new Date(f.scheduled_at)
    setForm({
      clinic_id: f.clinic_id,
      date: dt.toISOString().split('T')[0],
      time: dt.toTimeString().slice(0, 5),
      type: f.followup_type || 'Call',
      notes: f.notes || '',
      warn: f.warn_before || '1 hour'
    })
    setEditing(f)
    setShowAdd(true)
  }

  async function deleteFollowup(id) {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('followups').delete().eq('id', id)
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
    return followups.filter(f => f.scheduled_at && f.scheduled_at.startsWith(dateStr))
  }

  function formatTime(scheduled_at) {
    if (!scheduled_at) return ''
    const dt = new Date(scheduled_at)
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>←</button>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn secondary" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>→</button>
          <button className="btn" onClick={() => { setEditing(null); setForm({ clinic_id: '', date: '', time: '', type: 'Call', notes: '', warn: '1 hour' }); setShowAdd(true) }}>+ Add Follow-up</button>
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
                  {formatTime(f.scheduled_at)} {f.clinics?.name || 'Follow-up'}
                </div>
              ))}
              {dayFollowups.length > 3 && <div style={{ fontSize: 10, color: '#9ca3af' }}>+{dayFollowups.length - 3} more</div>}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Upcoming Follow-ups</h3>
        {followups.filter(f => new Date(f.scheduled_at) >= new Date()).slice(0, 20).map(f => (
          <div key={f.id} onClick={() => editFollowup(f)} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, color: '#14b8a6' }}>{f.clinics?.name || 'Clinic'}</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>{f.followup_type} — {new Date(f.scheduled_at).toLocaleString()}</div>
              {f.notes && <div style={{ fontSize: 12, color: '#6b7280' }}>{f.notes}</div>}
            </div>
            <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); deleteFollowup(f.id) }}>Delete</button>
          </div>
        ))}
        {!followups.filter(f => new Date(f.scheduled_at) >= new Date()).length && <p style={{ color: '#6b7280' }}>No upcoming follow-ups</p>}
      </div>

      {viewingDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setViewingDay(null)}>
          <div style={{ background: '#111827', padding: 24, borderRadius: 12, width: 420, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Follow-ups on {monthName.split(' ')[0]} {viewingDay}</h3>
            {getFollowupsForDay(viewingDay).map(f => (
              <div key={f.id} style={{ padding: 12, background: '#0b1220', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 500, color: '#14b8a6' }}>{f.clinics?.name || 'Clinic'}</div>
                <div style={{ fontSize: 13 }}>{formatTime(f.scheduled_at)} — {f.followup_type}</div>
                {f.notes && <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{f.notes}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setViewingDay(null); editFollowup(f) }}>Edit</button>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteFollowup(f.id)}>Delete</button>
                </div>
              </div>
            ))}
            {!getFollowupsForDay(viewingDay).length && <p style={{ color: '#6b7280' }}>No follow-ups</p>}
            <button className="btn secondary" style={{ marginTop: 12 }} onClick={() => setViewingDay(null)}>Close</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Follow-up' : 'Add Follow-up'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={form.clinic_id} onChange={e => setForm({...form, clinic_id: e.target.value})}>
                <option value="">Select Clinic</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Call</option>
                <option>Visit</option>
                <option>Email</option>
                <option>Meeting</option>
              </select>
              <select value={form.warn} onChange={e => setForm({...form, warn: e.target.value})}>
                <option>15 minutes</option>
                <option>1 hour</option>
                <option>1 day</option>
              </select>
              <textarea placeholder="Notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={saveFollowup}>Save</button>
              <button className="btn secondary" onClick={() => { setShowAdd(false); setEditing(null) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}