import { useState } from 'react'

export default function Tests({ tests = [], clinics = [], providers = [], onSelectClinic, onSelectProvider, selectedReps = [] }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const perPage = 25

  let filtered = tests
  if (selectedReps.length > 0) {
    const clinicIds = clinics.filter(c => selectedReps.includes(c.rep_id)).map(c => c.id)
    filtered = filtered.filter(t => clinicIds.includes(t.clinic_id))
  }
  if (search) {
    filtered = filtered.filter(t => 
      (t.test_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.accession || '').toLowerCase().includes(search.toLowerCase())
    )
  }

  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search tests..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <span style={{ color: '#9ca3af', fontSize: 14 }}>{filtered.length} tests</span>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Accession</th>
              <th>Collected</th>
              <th>Finalized</th>
              <th>Test</th>
              <th>Clinic</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(t => (
              <tr key={t.id}>
                <td>{t.accession || '—'}</td>
                <td>{t.collected_at || t.collected || '—'}</td>
                <td>{t.finalized_at || t.finalized || '—'}</td>
                <td>{t.test_type || '—'}</td>
                <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectClinic && clinics.find(c => c.id === t.clinic_id) && onSelectClinic(clinics.find(c => c.id === t.clinic_id))}>
                  {clinics.find(c => c.id === t.clinic_id)?.name || '—'}
                </td>
                <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectProvider && providers.find(p => p.id === t.provider_id) && onSelectProvider(providers.find(p => p.id === t.provider_id))}>
                  {providers.find(p => p.id === t.provider_id)?.name || t.provider_name || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!paged.length && <p style={{ color: '#6b7280', padding: 16 }}>No tests found.</p>}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="btn secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
          <span style={{ padding: '8px 12px', color: '#9ca3af' }}>{page + 1} / {totalPages}</span>
          <button className="btn secondary" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
