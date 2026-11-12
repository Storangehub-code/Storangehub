import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Reps({ selected, setSelected, clinics = [], tests = [], role }) {
  const [reps, setReps] = useState([])
  const [managers, setManagers] = useState([])
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' })
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
  }, [])

  async function createRep() {
    if (!form.first.trim() || !form.last.trim() || !form.email.trim()) return alert('First name, last name, and email are required')
    const full_name = form.first.trim() + ' ' + form.last.trim()
    const payload = { full_name, phone: form.phone, email: form.email, home_address: form.address, manager_id: form.manager_id || null, role: 'rep' }
    let error
    if (editing) {
      ({ error } = await supabase.from('profiles').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('profiles').insert(payload))
    }
    if (error) return alert(error.message)
    setForm({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' })
    setEditing(null)
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }

  function startEdit(r) {
    const parts = (r.full_name || '').split(' ')
    setForm({ first: parts[0] || '', last: parts.slice(1).join(' ') || '', phone: r.phone || '', email: r.email || '', address: r.home_address || '', manager_id: r.manager_id || '' })
    setEditing(r.id)
  }

  function toggle(id) {
    setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  function selectAll() {
    setSelected(selected.length === reps.length ? [] : reps.map(r => r.id))
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Reps</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Toggle which reps' data is visible</p>
      </div>
      <div className="card">
        <table>
          <thead><tr><th></th><th>Rep</th><th>Manager</th><th>Accounts</th><th>Tests</th><th></th></tr></thead>
          <tbody>
            {reps.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <td style={{ color: '#14b8a6' }}>{r.full_name || '—'}</td>
                <td>{managers.find(m => m.id === r.manager_id)?.full_name || '—'}</td>
                <td>{clinics.filter(c => c.rep_id === r.id).length}</td>
                <td>{tests.filter(t => clinics.some(c => c.id === t.clinic_id && c.rep_id === r.id)).length}</td>
                <td>{role === 'global_admin' && <button className="btn secondary btn-sm" onClick={() => startEdit(r)}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reps.length && <p style={{ color: '#6b7280' }}>No reps yet.</p>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button className="btn secondary" onClick={selectAll}>Select All</button>
      </div>
      {role === 'global_admin' && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{editing ? "Edit Rep" : "Create New Rep"}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>First Name</label><input value={form.first} onChange={e => setForm({...form, first: e.target.value})} /></div>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Last Name</label><input value={form.last} onChange={e => setForm({...form, last: e.target.value})} /></div>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%' }} /></div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: '#9ca3af' }}>Manager</label>
            <select value={form.manager_id} onChange={e => setForm({...form, manager_id: e.target.value})} style={{ width: '100%' }}>
              <option value="">Select manager...</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={createRep}>{editing ? "Update Rep" : "Create Rep"}</button>
            {editing && <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' }) }}>Cancel</button>}
          </div>
        </div>
      )}
    </div>
  )
}
