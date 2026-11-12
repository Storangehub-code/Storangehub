import { useState } from 'react'

export default function Accounts({ clinics = [], tests = [], onSelect, selectedReps = [], reps = [], role }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')

  let filtered = clinics.filter(c => !c.is_prospect)
  if (selectedReps.length > 0) {
    filtered = filtered.filter(c => selectedReps.includes(c.rep_id))
  }
  if (search) {
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
  }

  filtered.sort((a, b) => {
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
    if (sort === 'tests') {
      const aCount = tests.filter(t => t.clinic_id === a.id).length
      const bCount = tests.filter(t => t.clinic_id === b.id).length
      return bCount - aCount
    }
    return 0
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search accounts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="tests">Sort by Tests</option>
        </select>
        {role !== 'rep' && <button className="btn">+ Add Account</button>}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Type</th>
              <th>City</th>
              <th>Rep</th>
              <th>Tests</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => onSelect && onSelect(c)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#14b8a6' }}>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{reps.find(r => r.id === c.rep_id)?.full_name || '—'}</td>
                <td>{tests.filter(t => t.clinic_id === c.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 16 }}>No accounts found.</p>}
      </div>
    </div>
  )
}
