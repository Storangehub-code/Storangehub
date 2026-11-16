import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Managers() {
  const [managers, setManagers] = useState([])
  const [reps, setReps] = useState([])
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', address: '' })
  const [editing, setEditing] = useState(null)
  const [pickRep, setPickRep] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }, [])

  async function createManager() {
    if (!form.first.trim() || !form.last.trim() || !form.email.trim()) return alert('First name, last name, and email are required')
    const full_name = form.first.trim() + ' ' + form.last.trim()
    const payload = { full_name, phone: form.phone, email: form.email, home_address: form.address, role: 'manager' }
    let error
    if (editing) {
      ({ error } = await supabase.from('profiles').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('profiles').insert(payload))
    }
    if (error) return alert(error.message)
    setForm({ first: '', last: '', phone: '', email: '', address: '' })
    setEditing(null)
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
  }

  function startEdit(m) {
    const parts = (m.full_name || '').split(' ')
    setForm({ first: parts[0] || '', last: parts.slice(1).join(' ') || '', phone: m.phone || '', email: m.email || '', address: m.home_address || '' })
    setEditing(m.id)
  }

  async function assignRep(repId, managerId) {
    await supabase.from('profiles').update({ manager_id: managerId }).eq('id', repId)
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Managers</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Manage managers and assign reps</p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Current Managers</h3>
        {managers.map(m => {
          const assigned = reps.filter(r => r.manager_id === m.id)
          return (
            <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
              <div style={{ color: '#14b8a6', fontWeight: 600 }}>{m.full_name || '—'}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Reps: {assigned.length ? assigned.map(r => r.full_name).join(', ') : 'None'}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={pickRep} onChange={e => setPickRep(e.target.value)} style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' }}>
                  <option value="">Assign a rep...</option>
                  {reps.filter(r => r.manager_id !== m.id).map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
                <button className="btn secondary" onClick={() => { if (pickRep) { assignRep(pickRep, m.id); setPickRep('') } }}>Assign</button>
                <button className="btn secondary btn-sm" onClick={() => startEdit(m)}>Edit</button>
              </div>
            </div>
          )
        })}
        {!managers.length && <p style={{ color: '#6b7280' }}>No managers yet.</p>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{editing ? "Edit Manager" : "Add New Manager"}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>First Name</label><input value={form.first} onChange={e => setForm({...form, first: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Last Name</label><input value={form.last} onChange={e => setForm({...form, last: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%' }} /></div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" onClick={createManager}>{editing ? "Update Manager" : "Add Manager"}</button>
          {editing && <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ first: '', last: '', phone: '', email: '', address: '' }) }}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}
