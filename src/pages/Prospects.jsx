import { useState } from 'react'

export default function Prospects({ clinics = [], onSelect, selectedReps = [], reps = [] }) {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')

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

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
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
        <button className="btn">+ Add Prospect</button>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => onSelect && onSelect(c)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#14b8a6' }}>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td><span className="badge" style={{ background: c.stage === 'HOT' ? '#ef4444' : c.stage === 'Warm' ? '#f59e0b' : '#6b7280' }}>{c.stage || 'Cold'}</span></td>
                <td>{reps.find(r => r.id === c.rep_id)?.full_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 16 }}>No prospects found.</p>}
      </div>
    </div>
  )
}
