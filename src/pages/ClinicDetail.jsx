import { useState } from 'react'
import { supabase } from '../lib/supabase'

function formatProviderName(p) {
  const parts = (p.name || '').split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return p.name || 'Unknown'
}

export default function ClinicDetail({ clinic, providers = [], tests = [], onBack, onSelectProvider, onRefresh }) {
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProvider, setNewProvider] = useState({ first: '', last: '', title: '', email: '', phone: '', npi: '' })
  const [saving, setSaving] = useState(false)

  const clinicProviders = providers.filter(p => p.clinic_id === clinic.id)
  const clinicTests = tests.filter(t => t.clinic_id === clinic.id)

  const testCounts = {}
  clinicTests.forEach(t => { testCounts[t.test_type || 'Unknown'] = (testCounts[t.test_type || 'Unknown'] || 0) + 1 })

  const handleAddProvider = async () => {
    if (!newProvider.last || !newProvider.title || !newProvider.npi) {
      alert('Last name, title, and NPI are required')
      return
    }
    setSaving(true)
    const name = `${newProvider.last}, ${newProvider.title},${newProvider.first}`
    const { error } = await supabase.from('providers').insert({
      clinic_id: clinic.id,
      name,
      title: newProvider.title,
      email: newProvider.email || null,
      phone: newProvider.phone || null,
      npi: newProvider.npi
    })
    setSaving(false)
    if (error) {
      alert('Error adding provider: ' + error.message)
    } else {
      setShowAddProvider(false)
      setNewProvider({ first: '', last: '', title: '', email: '', phone: '', npi: '' })
      if (onRefresh) onRefresh()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn" onClick={() => window.open('https://www.responsedx.net/request-supplies', '_blank')}>Request Supplies</button>
        <button className="btn" onClick={() => window.open('https://www.responsedx.net/copy-of-request-an-account', '_blank')}>Request Pickup</button>
        <button className="btn" onClick={() => {
          const addr = `${clinic.address || ''}, ${clinic.city || ''}, ${clinic.state || ''} ${clinic.zip || ''}`.trim()
          window.open('https://www.google.com/maps/search/catering+near+' + encodeURIComponent(addr), '_blank')
        }}>Find Catering</button>
        <button className="btn secondary">Requisition Form ▾</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'providers', 'activity', 'tests'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? '' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p><strong>Type:</strong> {clinic.clinic_type || 'Clinic'}</p>
              <p><strong>Ordering URL:</strong> {clinic.ordering_url || '—'}</p>
              <p><strong>Requisition:</strong> {clinic.requisition || '—'}</p>
              <p><strong>City:</strong> {clinic.city || '—'}</p>
              <p><strong>Fax:</strong> {clinic.fax || '—'}</p>
              <p><strong>Email:</strong> {clinic.email || '—'}</p>
            </div>
            <div>
              <p><strong>EMR:</strong> {clinic.emr || '—'}</p>
              <p><strong>Supplies URL:</strong> {clinic.supplies_url || '—'}</p>
              <p><strong>Address:</strong> {clinic.address || '—'}, {clinic.city || ''}, {clinic.state || ''} {clinic.zip || ''}</p>
              <p><strong>Phone:</strong> {clinic.phone || '—'}</p>
            </div>
          </div>
          {clinic.office_contact && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f2937' }}>
              <strong>Office Contact:</strong> {clinic.office_contact}
            </div>
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Providers ({clinicProviders.length})</h3>
            <button className="btn" onClick={() => setShowAddProvider(true)}>+ Add Provider</button>
          </div>
          {clinicProviders.map(p => (
            <div key={p.id} onClick={() => onSelectProvider && onSelectProvider(p)} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#14b8a6', fontWeight: 500 }}>{formatProviderName(p)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{p.title || ''} {p.npi ? `• NPI: ${p.npi}` : ''}</div>
              </div>
              <div style={{ color: '#9ca3af', fontSize: 13 }}>{clinicTests.filter(t => t.provider_id === p.id).length} tests</div>
            </div>
          ))}
          {!clinicProviders.length && <p style={{ color: '#6b7280' }}>No providers</p>}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Activity</h3>
          <p style={{ color: '#6b7280' }}>Activity log coming soon</p>
        </div>
      )}

      {tab === 'tests' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests ({clinicTests.length})</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(testCounts).map(([type, count]) => (
              <div key={type} style={{ background: '#1f2937', padding: '8px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{count}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{type}</div>
              </div>
            ))}
          </div>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Accession</th><th>Collected</th><th>Test</th><th>Provider</th></tr></thead>
            <tbody>
              {clinicTests.slice(0, 25).map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{t.collected_at || t.collected || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                  <td>{t.provider_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {clinicTests.length > 25 && <p style={{ color: '#6b7280', marginTop: 12 }}>Showing first 25 of {clinicTests.length}</p>}
        </div>
      )}

      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 480 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Account</h3>
            <p style={{ color: '#9ca3af' }}>Edit form coming soon</p>
            <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => setShowEdit(false)}>Close</button>
          </div>
        </div>
      )}

      {showAddProvider && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Add Provider</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="First Name" value={newProvider.first} onChange={e => setNewProvider({...newProvider, first: e.target.value})} />
              <input placeholder="Last Name *" value={newProvider.last} onChange={e => setNewProvider({...newProvider, last: e.target.value})} />
              <input placeholder="Title * (MD, PA, FNP, etc)" value={newProvider.title} onChange={e => setNewProvider({...newProvider, title: e.target.value})} />
              <input placeholder="NPI *" value={newProvider.npi} onChange={e => setNewProvider({...newProvider, npi: e.target.value})} />
              <input placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} />
              <input placeholder="Phone" value={newProvider.phone} onChange={e => setNewProvider({...newProvider, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={handleAddProvider} disabled={saving}>{saving ? 'Saving...' : 'Add Provider'}</button>
              <button className="btn secondary" onClick={() => setShowAddProvider(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}