import { useState } from 'react'

function formatName(p) {
  const parts = (p.name || '').split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return p.name || 'Unknown'
}

export default function ProviderDetail({ provider, tests = [], clinics = [], onBack, onSelectClinic }) {
  const [tab, setTab] = useState('info')
  const clinic = clinics.find(c => c.id === provider.clinic_id)
  const providerTests = tests.filter(t => t.provider_id === provider.id)
  const testCounts = {}
  providerTests.forEach(t => { testCounts[t.test_type || 'Unknown'] = (testCounts[t.test_type || 'Unknown'] || 0) + 1 })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn">Edit</button>
        <button className="btn">Add Note</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'tests', 'activity'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? '' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>{formatName(provider)}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p><strong>Title:</strong> {provider.title || '—'}</p>
              <p><strong>NPI:</strong> {provider.npi || '—'}</p>
              <p><strong>Email:</strong> {provider.email || '—'}</p>
              <p><strong>Phone:</strong> {provider.phone || '—'}</p>
            </div>
            <div>
              <p><strong>Clinic:</strong> <span 
                style={{ color: '#14b8a6', cursor: 'pointer' }} 
                onClick={() => onSelectClinic && clinic && onSelectClinic(clinic)}
              >{clinic?.name || '—'}</span></p>
              <p><strong>Total Tests:</strong> {providerTests.length}</p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(testCounts).map(([type, count]) => (
              <div key={type} style={{ background: '#1f2937', padding: '8px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{count}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests ({providerTests.length})</h3>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Accession</th><th>Collected</th><th>Test</th></tr></thead>
            <tbody>
              {providerTests.slice(0, 25).map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{t.collected_at || t.collected || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {providerTests.length > 25 && <p style={{ color: '#6b7280', marginTop: 12 }}>Showing first 25</p>}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          <h3>Activity</h3>
          <p style={{ color: '#6b7280' }}>Notes and activity coming soon</p>
        </div>
      )}
    </div>
  )
}