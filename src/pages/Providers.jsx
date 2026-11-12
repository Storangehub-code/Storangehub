import { useState } from 'react'

function formatName(name) {
  if (!name) return '—'
  const parts = name.split(',').map(p => p.trim())
  if (parts.length === 3) return parts[0] + ', ' + parts[2] + ', ' + parts[1]
  return name
}

export default function Providers({ providers = [], clinics = [], tests = [], onSelect, selectedReps = [] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')

  let filtered = providers
  if (selectedReps.length > 0) {
    const clinicIds = clinics.filter(c => selectedReps.includes(c.rep_id)).map(c => c.id)
    filtered = filtered.filter(p => clinicIds.includes(p.clinic_id))
  }
  if (search) {
    filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()))
  }

  filtered.sort((a, b) => {
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
    if (sort === 'tests') {
      const aCount = tests.filter(t => t.provider_id === a.id).length
      const bCount = tests.filter(t => t.provider_id === b.id).length
      return bCount - aCount
    }
    return 0
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search providers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="tests">Sort by Tests</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Clinic</th>
              <th>NPI</th>
              <th>Tests</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => onSelect && onSelect(p)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#14b8a6' }}>{formatName(p.name)}</td>
                <td>{clinics.find(c => c.id === p.clinic_id)?.name || p.clinics?.name || '—'}</td>
                <td>{p.npi || '—'}</td>
                <td>{tests.filter(t => t.provider_id === p.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 16 }}>No providers found.</p>}
      </div>
    </div>
  )
}
