import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', home_address: '' })
  const protectedIds = ['3fac6f60-da66-47cd-9770-d0830a9f6802', 'fdc1e445-e0bc-4ba8-b96e-bb21618faffe', '47ed75c5-e011-4471-9658-eb1ad63553eb']

  useEffect(() => { 
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data || [])) 
  }, [])

  async function save() {
    if (!form.full_name.trim() || !editing) return
    await supabase.from('profiles').update({ full_name: form.full_name, email: form.email, home_address: form.home_address }).eq('id', editing)
    setEditing(null)
    setForm({ full_name: '', email: '', home_address: '' })
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data || []))
  }

  async function remove(id) {
    if (!confirm('Delete this user?')) return
    await supabase.from('profiles').delete().eq('id', id)
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data || []))
  }

  async function resetPassword(email) {
    if (!email) return alert('No email on file')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) alert('Error: ' + error.message)
    else alert('Password reset email sent to ' + email)
  }

  function startEdit(u) {
    setForm({ full_name: u.full_name || '', email: u.email || '', home_address: u.home_address || '' })
    setEditing(u.id)
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>All Users</h3>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name || '—'}</td>
                <td><span className="badge" style={{ background: u.role === 'global_admin' ? '#0d9488' : u.role === 'manager' ? '#3b82f6' : '#6b7280' }}>{u.role}</span></td>
                <td>{u.email || '—'}</td>
                <td>
                  {!protectedIds.includes(u.id) && (
                    <>
                      <button className="btn secondary btn-sm" onClick={() => startEdit(u)} style={{ marginRight: 4 }}>Edit</button>
                      <button className="btn secondary btn-sm" onClick={() => remove(u.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Edit User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Name</label><input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.home_address} onChange={e => setForm({...form, home_address: e.target.value})} /></div>
          </div>
          <button className="btn" onClick={save}>Save</button>
          <button className="btn secondary" onClick={() => resetPassword(form.email)} style={{ marginLeft: 8 }}>Reset Password</button>
          <button className="btn secondary" onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
    </div>
  )
}
