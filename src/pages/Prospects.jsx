import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Prospects({ clinics = [], onSelect, selectedReps = [], reps = [], role, currentUser, onRefresh }) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [ordering, setOrdering] = useState(null)
  const [supplies, setSupplies] = useState({ reqs: 'yes', wound: 0, uti: 0, rpp: 0, synovi: 0, labels: 'FedEx', labelQty: 0, bags: 0, results: [] })
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', address: '', phone: '', email: '', fax: '', stage: 'Cold', emr: '' })
  const [saving, setSaving] = useState(false)

  let filtered = clinics.filter(c => c.is_prospect)
  if (selectedReps.length > 0) {
    filtered = filtered.filter(c => selectedReps.includes(c.rep_id))
  }
  if (search) {
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  }
  if (stageFilter !== 'all') {
    filtered = filtered.filter(c => (c.stage || 'Cold') === stageFilter)
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

  const handleStageChange = async (clinic, newStage) => {
    await supabase.from('clinics').update({ stage: newStage }).eq('id', clinic.id)
    if (onRefresh) onRefresh()
  }

  const submitOrder = async () => {
    const orderData = JSON.stringify(supplies)
    await supabase.from('clinics').update({ stage: 'Pending', order_details: orderData }).eq('id', ordering.id)
    
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'global_admin')
    if (admins) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          message: `New order request: ${ordering.name}`,
          type: 'order_request',
          clinic_id: ordering.id
        })
      }
    }
    
    const orderDetails = `
Clinic: ${ordering.name}
Type: ${ordering.type || 'N/A'}
City: ${ordering.city || 'N/A'}
Phone: ${ordering.phone || 'N/A'}

Supplies Requested:
- Requisitions: ${supplies.reqs}
- Wound kits: ${supplies.wound}
- UTI kits: ${supplies.uti}
- RPP kits: ${supplies.rpp}
- SynoviFact: ${supplies.synovi}
- Shipping: ${supplies.labels} x${supplies.labelQty}
- Bags: ${supplies.bags}
- Results: ${supplies.results.join(', ') || 'None'}
    `
    
    try {
      await fetch('/.netlify/functions/sendemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'spud.w.mann@gmail.com',
          subject: 'New Order Request: ' + ordering.name,
          text: orderDetails
        })
      })
    } catch (e) { console.log('Email error', e) }
    
    alert('Order submitted! Pending Global Admin approval.')
    setOrdering(null)
    setSupplies({ reqs: 'yes', wound: 0, uti: 0, rpp: 0, synovi: 0, labels: 'FedEx', labelQty: 0, bags: 0, results: [] })
    if (onRefresh) onRefresh()
  }

  if (ordering) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Ready to Order: {ordering.name}</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Requisitions with kits?</label>
          <select value={supplies.reqs} onChange={e => setSupplies({...supplies, reqs: e.target.value})} style={{ marginLeft: 8 }}>
            <option value="yes">Yes</option><option value="no">No</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label>RDX Wound kits</label><input type="number" min="0" max="25" value={supplies.wound} onChange={e => setSupplies({...supplies, wound: e.target.value})} /></div>
          <div><label>RDX UTI/UTI Plus</label><input type="number" min="0" max="25" value={supplies.uti} onChange={e => setSupplies({...supplies, uti: e.target.value})} /></div>
          <div><label>RDX RPP</label><input type="number" min="0" max="25" value={supplies.rpp} onChange={e => setSupplies({...supplies, rpp: e.target.value})} /></div>
          <div><label>RDX SynoviFact</label><input type="number" min="0" max="25" value={supplies.synovi} onChange={e => setSupplies({...supplies, synovi: e.target.value})} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Return Shipping Labels</label>
          <select value={supplies.labels} onChange={e => setSupplies({...supplies, labels: e.target.value})} style={{ marginLeft: 8 }}>
            <option>FedEx</option><option>UPS</option>
          </select>
          <input type="number" min="0" max="25" value={supplies.labelQty} onChange={e => setSupplies({...supplies, labelQty: e.target.value})} placeholder="Qty" style={{ marginLeft: 8, width: 80 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Return Shipping Bags</label>
          <input type="number" min="0" max="25" value={supplies.bags} onChange={e => setSupplies({...supplies, bags: e.target.value})} style={{ marginLeft: 8, width: 80 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Results Sent</label>
          {['Fax', 'Portal', 'Encrypted Email'].map(opt => (
            <label key={opt} style={{ marginRight: 16 }}>
              <input type="checkbox" checked={supplies.results.includes(opt)} onChange={e => {
                const results = e.target.checked ? [...supplies.results, opt] : supplies.results.filter(r => r !== opt)
                setSupplies({...supplies, results})
              }} /> {opt}
            </label>
          ))}
        </div>
        <button className="btn" onClick={submitOrder}>Submit Order</button>
        <button className="btn secondary" onClick={() => setOrdering(null)} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    )
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
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
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
                    style={{ background: c.stage === 'HOT' ? '#ef4444' : c.stage === 'Warm' ? '#f59e0b' : c.stage === 'Pending' ? '#8b5cf6' : '#6b7280', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px' }}
                  >
                    <option>Cold</option>
                    <option>Warm</option>
                    <option>HOT</option>
                    <option>Pending</option>
                  </select>
                </td>
                <td>{reps.find(r => r.id === c.rep_id)?.full_name || '—'}</td>
                <td>
                  {c.stage === 'Pending' ? (
                    <span style={{ color: '#8b5cf6' }}>Pending Approval</span>
                  ) : (
                    <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setOrdering(c)}>
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