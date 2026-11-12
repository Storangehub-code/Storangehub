import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Prospects({ clinics = [], onSelect, selectedReps = [], reps = [], role, currentUser, onRefresh }) {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', address: '', phone: '', email: '', fax: '', stage: 'Cold', emr: '' })
  const [saving, setSaving] = useState(false)

  let filtered = clinics.filter(c => c.is_prospect)
  if (selectedReps.length > 0) {
    filtered = filtered.filter(c => selectedReps.includes(c.rep_id))
  }
  if (search) {
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  }
  if (stage !== 'all') {
    filtered = filtered.filter(c => (c.stage || 'Cold') === stage)
  }

  const handleAdd = async () => {
    if (!form.name) {
      alert('Clinic name is required')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('clinics').insert({
      name: form.name,
      type: form.type,
      city: form.city || null,
      state: form.state || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      fax: form.fax || null,
      stage: form.stage,
      emr: form.emr || null,
      is_prospect: true,
      rep_id: currentUser?.id || null
    })
    setSaving(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowAdd(false)
      setForm({ name: '', type: 'Orthopedic', city: '', state: '', address: '', phone: '', email: '', fax: '', stage: 'Cold', emr: '' })
      if (onRefresh) onRefresh()
    }
  }

  const handleReadyToOrder = async (clinic) => {
    const { error } = await supabase.from('clinics').update({ 
      needs_approval: true, 
      status: 'pending' 
    }).eq('id', clinic.id)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      if (onRefresh) onRefresh()
    }
  }

  const handleStageChange = async (clinic, newStage) => {
    await supabase.from('clinics').update({ stage: newStage }).eq('id', clinic.id)
    if (onRefresh) onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Prospect</button>
        <input
          placeholder="Search prospects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <select value={stage} onChange={e => setStage(e.target.value)}>
          <option value="all">All Stages</option>
          <option value="Cold">Cold</option>
          <option value="Warm">Warm</option>
          <option value="HOT">HOT</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Type</th>
              <th>City</th>
              <th>Stage</th>
              <th>Rep</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelect && onSelect(c)}>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>
                  <select 
                    value={c.stage || 'Cold'} 
                    onChange={e => handleStageChange(c, e.target.value)}
                    style={{ background: c.stage === 'HOT' ? '#ef4444' : c.stage === 'Warm' ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px' }}
                  >
                    <option>Cold</option>
                    <option>Warm</option>
                    <option>HOT</option>
                  </select>
                </td>
                <td>{reps.find(r => r.id === c.rep_id)?.full_name || '—'}</td>
                <td>
                  {c.status === 'pending' ? (
                    <span style={{ color: '#f59e0b' }}>Pending Approval</span>
                  ) : (
                    <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => handleReadyToOrder(c)}>
                      Ready to Order
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 16 }}>No prospects found.</p>}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Add Prospect</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Clinic Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Orthopedic</option>
                <option>Pain Management</option>
                <option>Wound Care</option>
                <option>Podiatry</option>
                <option>Primary Care</option>
                <option>Other</option>
              </select>
              <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={{ flex: 2 }} />
                <input placeholder="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} style={{ flex: 1 }} />
              </div>
              <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <input placeholder="Fax" value={form.fax} onChange={e => setForm({...form, fax: e.target.value})} />
              <input placeholder="EMR" value={form.emr} onChange={e => setForm({...form, emr: e.target.value})} />
              <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                <option>Cold</option>
                <option>Warm</option>
                <option>HOT</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save Prospect'}</button>
              <button className="btn secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}