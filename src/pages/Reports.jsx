import { useState } from 'react'

function formatName(name) {
  if (!name) return '—'
  const parts = name.split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return name
}

export default function Reports({ clinics = [], tests = [], providers = [], selectedReps = [] }) {
  const [report, setReport] = useState('volume')
  const [activeAccountsPage, setActiveAccountsPage] = useState(0)
  const [activeProvidersPage, setActiveProvidersPage] = useState(0)
  const [inactiveAccountsPage, setInactiveAccountsPage] = useState(0)
  const [inactiveProvidersPage, setInactiveProvidersPage] = useState(0)
  const perPage = 10

  let filteredTests = tests
  let filteredClinics = clinics
  let filteredProviders = providers

  if (selectedReps.length > 0) {
    filteredClinics = clinics.filter(c => selectedReps.includes(c.rep_id))
    const clinicIds = filteredClinics.map(c => c.id)
    filteredTests = tests.filter(t => clinicIds.includes(t.clinic_id))
    filteredProviders = providers.filter(p => clinicIds.includes(p.clinic_id))
  }

  // Monthly volume
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']
  const monthMap = { Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11' }
  const monthlyCounts = {}
  months.forEach(m => { monthlyCounts[m] = 0 })
  filteredTests.forEach(t => {
    const d = t.collected_at || t.collected
    if (d) {
      const month = d.substring(5, 7)
      const monthName = Object.entries(monthMap).find(([k, v]) => v === month)?.[0]
      if (monthName) monthlyCounts[monthName]++
    }
  })
  const maxCount = Math.max(...Object.values(monthlyCounts), 1)

  // Test types
  const typeCounts = {}
  filteredTests.forEach(t => {
    const type = t.test_type || 'Unknown'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })

  // Active/Inactive logic (30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const clinicLastTest = {}
  const providerLastTest = {}
  filteredTests.forEach(t => {
    const d = t.collected_at || t.collected
    if (!d) return
    if (t.clinic_id && (!clinicLastTest[t.clinic_id] || d > clinicLastTest[t.clinic_id])) {
      clinicLastTest[t.clinic_id] = d
    }
    if (t.provider_id && (!providerLastTest[t.provider_id] || d > providerLastTest[t.provider_id])) {
      providerLastTest[t.provider_id] = d
    }
  })

  const activeAccounts = filteredClinics.filter(c => clinicLastTest[c.id] && clinicLastTest[c.id] >= thirtyDaysAgoStr)
  const inactiveAccounts = filteredClinics.filter(c => !clinicLastTest[c.id] || clinicLastTest[c.id] < thirtyDaysAgoStr)
  const activeProviders = filteredProviders.filter(p => providerLastTest[p.id] && providerLastTest[p.id] >= thirtyDaysAgoStr)
  const inactiveProviders = filteredProviders.filter(p => !providerLastTest[p.id] || providerLastTest[p.id] < thirtyDaysAgoStr)

  const pagedActiveAccounts = activeAccounts.slice(activeAccountsPage * perPage, (activeAccountsPage + 1) * perPage)
  const pagedActiveProviders = activeProviders.slice(activeProvidersPage * perPage, (activeProvidersPage + 1) * perPage)
  const pagedInactiveAccounts = inactiveAccounts.slice(inactiveAccountsPage * perPage, (inactiveAccountsPage + 1) * perPage)
  const pagedInactiveProviders = inactiveProviders.slice(inactiveProvidersPage * perPage, (inactiveProvidersPage + 1) * perPage)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={report === 'volume' ? 'btn' : 'btn secondary'} onClick={() => setReport('volume')}>Monthly Volume</button>
        <button className={report === 'types' ? 'btn' : 'btn secondary'} onClick={() => setReport('types')}>By Test Type</button>
      </div>

      {report === 'volume' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Monthly Testing Volume</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 12 }}>
            {months.map(m => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{monthlyCounts[m]}</div>
                <div style={{ height: `${Math.max(20, (monthlyCounts[m] / maxCount) * 160)}px`, background: 'linear-gradient(to top, #0d9488, #14b8a6)', borderRadius: '4px 4px 0 0' }}></div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report === 'types' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Tests by Type</h3>
          <table>
            <thead><tr><th>Test Type</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <tr key={type}><td>{type}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
          {!Object.keys(typeCounts).length && <p style={{ color: '#6b7280' }}>No test data.</p>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Active Accounts</h3>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>At least one provider sent in last 30 days</p>
          {pagedActiveAccounts.map(c => (
            <div key={c.id} style={{ padding: '6px 0', color: '#14b8a6' }}>{c.name}</div>
          ))}
          {!pagedActiveAccounts.length && <p style={{ color: '#6b7280' }}>None</p>}
          {activeAccounts.length > perPage && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={activeAccountsPage === 0} onClick={() => setActiveAccountsPage(activeAccountsPage - 1)}>←</button>
              <span style={{ padding: '4px 8px', color: '#9ca3af' }}>{activeAccountsPage + 1}-{Math.min((activeAccountsPage + 1) * perPage, activeAccounts.length)}</span>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={(activeAccountsPage + 1) * perPage >= activeAccounts.length} onClick={() => setActiveAccountsPage(activeAccountsPage + 1)}>→</button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Active Providers</h3>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>Sent in last 30 days</p>
          {pagedActiveProviders.map(p => (
            <div key={p.id} style={{ padding: '6px 0', color: '#14b8a6' }}>{formatName(p.name)}</div>
          ))}
          {!pagedActiveProviders.length && <p style={{ color: '#6b7280' }}>None</p>}
          {activeProviders.length > perPage && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={activeProvidersPage === 0} onClick={() => setActiveProvidersPage(activeProvidersPage - 1)}>←</button>
              <span style={{ padding: '4px 8px', color: '#9ca3af' }}>{activeProvidersPage + 1}-{Math.min((activeProvidersPage + 1) * perPage, activeProviders.length)}</span>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={(activeProvidersPage + 1) * perPage >= activeProviders.length} onClick={() => setActiveProvidersPage(activeProvidersPage + 1)}>→</button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Accounts Gone Inactive</h3>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>No tests in last 30 days</p>
          {pagedInactiveAccounts.map(c => (
            <div key={c.id} style={{ padding: '6px 0', color: '#14b8a6' }}>{c.name}</div>
          ))}
          {!pagedInactiveAccounts.length && <p style={{ color: '#6b7280' }}>None</p>}
          {inactiveAccounts.length > perPage && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={inactiveAccountsPage === 0} onClick={() => setInactiveAccountsPage(inactiveAccountsPage - 1)}>←</button>
              <span style={{ padding: '4px 8px', color: '#9ca3af' }}>{inactiveAccountsPage + 1}-{Math.min((inactiveAccountsPage + 1) * perPage, inactiveAccounts.length)}</span>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={(inactiveAccountsPage + 1) * perPage >= inactiveAccounts.length} onClick={() => setInactiveAccountsPage(inactiveAccountsPage + 1)}>→</button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Providers Gone Inactive</h3>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>No tests in last 30 days</p>
          {pagedInactiveProviders.map(p => (
            <div key={p.id} style={{ padding: '6px 0', color: '#14b8a6' }}>{formatName(p.name)}</div>
          ))}
          {!pagedInactiveProviders.length && <p style={{ color: '#6b7280' }}>None</p>}
          {inactiveProviders.length > perPage && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={inactiveProvidersPage === 0} onClick={() => setInactiveProvidersPage(inactiveProvidersPage - 1)}>←</button>
              <span style={{ padding: '4px 8px', color: '#9ca3af' }}>{inactiveProvidersPage + 1}-{Math.min((inactiveProvidersPage + 1) * perPage, inactiveProviders.length)}</span>
              <button className="btn" style={{ padding: '4px 12px' }} disabled={(inactiveProvidersPage + 1) * perPage >= inactiveProviders.length} onClick={() => setInactiveProvidersPage(inactiveProvidersPage + 1)}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}