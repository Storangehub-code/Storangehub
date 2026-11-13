import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Prospects({ clinics = [], onSelect, selectedReps = [], reps = [], role, currentUser, onRefresh }) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [ordering, setOrdering] = useState(null)
  const [supplies, setSupplies] = useState({ 
    reqs: 'yes', wound: 0, uti: 0, rpp: 0, synovi: 0, labels: 'FedEx', labelQty: 0, bags: 0, 
    results: [], firstShipment: 'clinic', otherAddress: '',
    faxNumber: '', portalFirst: '', portalLast: '', portalEmail: '',
    encFirst: '', encLast: '', encEmail: ''
  })
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', address: '', phone: '', email: '', fax: '', stage: 'Cold', emr: '' })
  const [providers, setProviders] = useState([{ first: '', last: '', title: '', npi: '' }])
  const [saving, setSaving] = useState(false)

  let filtered = clinics.filter(c => c.is_prospect)
  if (selectedReps.length > 0) filtered = filtered.filter(c => selectedReps.includes(c.rep_id))
  if (search) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  if (stageFilter !== 'all') filtered = filtered.filter(c => (c.stage || 'Cold') === stageFilter)

  const addProviderRow = () => setProviders([...providers, { first: '', last: '', title: '', npi: '' }])
  const removeProviderRow = (i) => { if (providers.length > 1) setProviders(providers.filter((_, idx) => idx !== i)) }
  const updateProvider = (i, field, val) => { const u = [...providers]; u[i][field] = val; setProviders(u) }

  const handleAdd = async () => {
    if (!form.name) return alert('Clinic name is required')
    setSaving(true)
    const { data: clinicData, error } = await supabase.from('clinics').insert({
      name: form.name, type: form.type, city: form.city || null, state: form.state || null,
      address: form.address || null, phone: form.phone || null, email: form.email || null,
      fax: form.fax || null, stage: form.stage, emr: form.emr || null, is_prospect: true, rep_id: currentUser?.id || null
    }).select().single()
    if (error) { setSaving(false); return alert('Error: ' + error.message) }
    const valid = providers.filter(p => p.last && p.title && p.npi)
    if (valid.length > 0 && clinicData) {
      for (const p of valid) {
        await supabase.from('providers').insert({ clinic_id: clinicData.id, name: `${p.last}, ${p.title},${p.first}`, title: p.title, npi: p.npi })
      }
    }
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', type: 'Orthopedic', city: '', state: '', address: '', phone: '', email: '', fax: '', stage: 'Cold', emr: '' })
    setProviders([{ first: '', last: '', title: '', npi: '' }])
    if (onRefresh) onRefresh()
  }

  const handleStageChange = async (clinic, newStage) => {
    await supabase.from('clinics').update({ stage: newStage }).eq('id', clinic.id)
    if (onRefresh) onRefresh()
  }

  const submitOrder = async () => {
    const { data: clinicProviders } = await supabase.from('providers').select('*').eq('clinic_id', ordering.id)
    const orderData = JSON.stringify({ supplies, providers: clinicProviders || [] })
    await supabase.from('clinics').update({ stage: 'Pending', order_details: orderData }).eq('id', ordering.id)
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'global_admin')
    if (admins) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({ user_id: admin.id, message: `New order request: ${ordering.name}`, type: 'order_request', clinic_id: ordering.id })
      }
    }
    let providerList = 'None listed'
    if (clinicProviders?.length) {
      providerList = clinicProviders.map(p => {
        const parts = (p.name || '').split(',')
        return `${parts[2] || ''} ${parts[0] || ''} (${parts[1] || p.title || ''}) - NPI: ${p.npi || 'N/A'}`
      }).join('\n')
    }
    const orderDetails = `Clinic: ${ordering.name}
Type: ${ordering.type || 'N/A'}
City: ${ordering.city || 'N/A'}
Phone: ${ordering.phone || 'N/A'}
Address: ${ordering.address || 'N/A'}

Providers:
${providerList}

First Shipment: ${supplies.firstShipment === 'clinic' ? 'To Clinic' : supplies.firstShipment === 'rep' ? 'To Rep' : 'Other: ' + supplies.otherAddress}

Supplies:
- Requisitions: ${supplies.reqs}
- Wound: ${supplies.wound}
- UTI: ${supplies.uti}
- RPP: ${supplies.rpp}
- SynoviFact: ${supplies.synovi}
- Shipping: ${supplies.labels} x${supplies.labelQty}
- Bags: ${supplies.bags}

Results:
${supplies.results.includes('Fax') ? '- Fax: ' + supplies.faxNumber : ''}
${supplies.results.includes('Portal') ? '- Portal: ' + supplies.portalFirst + ' ' + supplies.portalLast + ' (' + supplies.portalEmail + ')' : ''}
${supplies.results.includes('Encrypted Email') ? '- Encrypted: ' + supplies.encFirst + ' ' + supplies.encLast + ' (' + supplies.encEmail + ')' : ''}
${!supplies.results.length ? '- None' : ''}`
    try {
      await fetch('/.netlify/functions/sendemail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: 'spud.w.mann@gmail.com', subject: 'New Order: ' + ordering.name, text: orderDetails }) })
    } catch (e) { console.log(e) }
    alert('Order submitted!')
    setOrdering(null)
    setSupplies({ reqs: 'yes', wound: 0, uti: 0, rpp: 0, synovi: 0, labels: 'FedEx', labelQty: 0, bags: 0, results: [], firstShipment: 'clinic', otherAddress: '', faxNumber: '', portalFirst: '', portalLast: '', portalEmail: '', encFirst: '', encLast: '', encEmail: '' })
    if (onRefresh) onRefresh()
  }

  if (ordering) {
    const toggleResult = (val) => {
      const current = supplies.results || []
      setSupplies({...supplies, results: current.includes(val) ? current.filter(r => r !== val) : [...current, val]})
    }
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
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><label>Return Shipping Labels</label>
            <select value={supplies.labels} onChange={e => setSupplies({...supplies, labels: e.target.value})}><option>FedEx</option><option>UPS</option></select>
          </div>
          <div style={{ flex: 1 }}><label>Label Qty</label><input type="number" min="0" max="25" value={supplies.labelQty} onChange={e => setSupplies({...supplies, labelQty: e.target.value})} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label>Return Shipping Bags</label><input type="number" min="0" max="25" value={supplies.bags} onChange={e => setSupplies({...supplies, bags: e.target.value})} style={{ width: 100, marginLeft: 8 }} /></div>
        <div style={{ marginBottom: 16, borderTop: '1px solid #1f2937', paddingTop: 12 }}>
          <label style={{ fontWeight: 600 }}>First Shipment</label>
          <select value={supplies.firstShipment} onChange={e => setSupplies({...supplies, firstShipment: e.target.value})} style={{ marginLeft: 8 }}>
            <option value="clinic">To Clinic</option><option value="rep">To Rep</option><option value="other">Other Location</option>
          </select>
          {supplies.firstShipment === 'other' && <input placeholder="Enter address" value={supplies.otherAddress} onChange={e => setSupplies({...supplies, otherAddress: e.target.value})} style={{ marginTop: 8, width: '100%' }} />}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Results Sent</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={supplies.results.includes('Fax')} onChange={() => toggleResult('Fax')} /><span>Fax</span>
            {supplies.results.includes('Fax') && <input placeholder="Fax number" value={supplies.faxNumber} onChange={e => setSupplies({...supplies, faxNumber: e.target.value})} style={{ width: 150 }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input type="checkbox" checked={supplies.results.includes('Portal')} onChange={() => toggleResult('Portal')} /><span>Portal</span>
            {supplies.results.includes('Portal') && <><input placeholder="First" value={supplies.portalFirst} onChange={e => setSupplies({...supplies, portalFirst: e.target.value})} style={{ width: 100 }} /><input placeholder="Last" value={supplies.portalLast} onChange={e => setSupplies({...supplies, portalLast: e.target.value})} style={{ width: 100 }} /><input placeholder="Email" value={supplies.portalEmail} onChange={e => setSupplies({...supplies, portalEmail: e.target.value})} style={{ width: 180 }} /></>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="checkbox" checked={supplies.results.includes('Encrypted Email')} onChange={() => toggleResult('Encrypted Email')} /><span>Encrypted Email</span>
            {supplies.results.includes('Encrypted Email') && <><input placeholder="First" value={supplies.encFirst} onChange={e => setSupplies({...supplies, encFirst: e.target.value})} style={{ width: 100 }} /><input placeholder="Last" value={supplies.encLast} onChange={e => setSupplies({...supplies, encLast: e.target.value})} style={{ width: 100 }} /><input placeholder="Email" value={supplies.encEmail} onChange={e => setSupplies({...supplies, encEmail: e.target.value})} style={{ width: 180 }} /></>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={submitOrder}>Submit Order</button>
          <button className="btn secondary" onClick={() => setOrdering(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Prospect</button>
        <input placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 300 }} />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option><option value="Cold">Cold</option><option value="Warm">Warm</option><option value="HOT">HOT</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Clinic</th><th>Type</th><th>City</th><th>Stage</th><th>Rep</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelect && onSelect(c)}>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>
                  <select value={c.stage || 'Cold'} onChange={e => handleStageChange(c, e.target.value)} style={{ background: c.stage === 'HOT' ? '#ef4444' : c.stage === 'Warm' ? '#f59e0b' : c.stage === 'Pending' ? '#8b5cf6' : '#6b7280', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px' }}>
                    <option>Cold</option><option>Warm</option><option>HOT</option><option>Pending</option>
                  </select>
                </td>
                <td>{reps.find(r => r.id === c.rep_id)?.full_name || '—'}</td>
                <td>{c.stage === 'Pending' ? <span style={{ color: '#8b5cf6' }}>Pending Approval</span> : <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setOrdering(c)}>Ready to Order</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 16 }}>No prospects found.</p>}
      </div>
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 520, maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Add Prospect</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Clinic Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Orthopedic</option><option>Pain Management</option><option>Wound Care</option><option>Podiatry</option><option>Primary Care</option><option>Other</option>
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
              <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}><option>Cold</option><option>Warm</option><option>HOT</option></select>
              <div style={{ marginTop: 12, borderTop: '1px solid #1f2937', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Providers</strong>
                  <button type="button" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addProviderRow}>+ Add</button>
                </div>
                {providers.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <input placeholder="First" value={p.first} onChange={e => updateProvider(i, 'first', e.target.value)} style={{ flex: 1 }} />
                    <input placeholder="Last *" value={p.last} onChange={e => updateProvider(i, 'last', e.target.value)} style={{ flex: 1 }} />
                    <input placeholder="Title *" value={p.title} onChange={e => updateProvider(i, 'title', e.target.value)} style={{ width: 70 }} />
                    <input placeholder="NPI *" value={p.npi} onChange={e => updateProvider(i, 'npi', e.target.value)} style={{ flex: 1 }} />
                    {providers.length > 1 && <button type="button" className="btn secondary" style={{ padding: '4px 8px' }} onClick={() => removeProviderRow(i)}>−</button>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save Prospect'}</button>
              <button className="btn secondary" onClick={() => { setShowAdd(false); setProviders([{ first: '', last: '', title: '', npi: '' }]) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}