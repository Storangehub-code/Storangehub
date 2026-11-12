import { useState } from 'react'

export default function Accounts({ clinics = [], tests = [], onSelect, selectedReps = [], reps = [], role }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('az')
  const [showAdd, setShowAdd] = useState(false)
  const [routeMode, setRouteMode] = useState(false)
  const [selectedForRoute, setSelectedForRoute] = useState([])

  let filtered = clinics.filter(c => !c.is_prospect)
  if (selectedReps.length > 0) {
    filtered = filtered.filter(c => selectedReps.includes(c.rep_id))
  }
  if (search) {
    filtered = filtered.filter(c => 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase())
    )
  }
  if (sort === 'az') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  if (sort === 'za') filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
  if (sort === 'tests') {
    filtered.sort((a, b) => {
      const aCount = tests.filter(t => t.clinic_id === a.id).length
      const bCount = tests.filter(t => t.clinic_id === b.id).length
      return bCount - aCount
    })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  function isActive(clinic) {
    return tests.some(t => t.clinic_id === clinic.id && (t.collected_at || t.collected || '') >= thirtyDaysAgo)
  }

  function hasSynoviFactInactive(clinic) {
    const hasEver = tests.some(t => t.clinic_id === clinic.id && (t.test_type || '').toLowerCase().includes('synovi'))
    const recent = tests.some(t => t.clinic_id === clinic.id && (t.test_type || '').toLowerCase().includes('synovi') && (t.collected_at || t.collected || '') >= new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    return hasEver && !recent
  }

  function toggleRoute(id) {
    setSelectedForRoute(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function buildRoute() {
    const addresses = selectedForRoute.map(id => {
      const c = clinics.find(cl => cl.id === id)
      return c ? `${c.address || ''}, ${c.city || ''}, ${c.state || ''} ${c.zip || ''}`.trim() : ''
    }).filter(Boolean)
    if (addresses.length) {
      const url = 'https://www.google.com/maps/dir/' + addresses.map(a => encodeURIComponent(a)).join('/')
      window.open(url, '_blank')
    }
    setRouteMode(false)
    setSelectedForRoute([])
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Account</button>
        <button className="btn secondary" onClick={() => setRouteMode(!routeMode)}>{routeMode ? 'Cancel Route' : 'Build Route'}</button>
        {routeMode && selectedForRoute.length > 0 && (
          <button className="btn" onClick={buildRoute}>Make Route ({selectedForRoute.length})</button>
        )}
        <input
          placeholder="Search accounts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 280 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="az">A-Z</option>
          <option value="za">Z-A</option>
          <option value="tests">Most Tests</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {filtered.map(c => {
          const active = isActive(c)
          const synoviFlag = hasSynoviFactInactive(c)
          const selected = selectedForRoute.includes(c.id)
          return (
            <div
              key={c.id}
              onClick={() => routeMode ? toggleRoute(c.id) : onSelect && onSelect(c)}
              className="card"
              style={{
                cursor: 'pointer',
                border: synoviFlag ? '2px solid #f59e0b' : selected ? '2px solid #14b8a6' : '1px solid #1f2937',
                padding: 14
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: '#14b8a6', fontSize: 14, lineHeight: 1.3 }}>{c.name}</div>
                <span className={`badge ${active ? 'active' : 'inactive'}`} style={{ fontSize: 10 }}>{active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{c.address || '—'}, {c.city || ''}, {c.state || ''} {c.zip || ''}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{c.phone || '—'}</div>
              {role !== 'rep' && c.rep_id && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  {reps.find(r => r.id === c.rep_id)?.full_name || ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!filtered.length && <p style={{ color: '#6b7280', marginTop: 16 }}>No accounts found.</p>}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Add Account</h3>
            <p style={{ color: '#9ca3af' }}>Add account form coming next</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
