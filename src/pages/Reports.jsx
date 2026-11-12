import { useState } from 'react'

export default function Reports({ clinics = [], tests = [], providers = [], selectedReps = [] }) {
  const [report, setReport] = useState('volume')

  let filteredTests = tests
  if (selectedReps.length > 0) {
    const clinicIds = clinics.filter(c => selectedReps.includes(c.rep_id)).map(c => c.id)
    filteredTests = tests.filter(t => clinicIds.includes(t.clinic_id))
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

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={report === 'volume' ? 'btn' : 'btn secondary'} onClick={() => setReport('volume')}>Monthly Volume</button>
        <button className={report === 'types' ? 'btn' : 'btn secondary'} onClick={() => setReport('types')}>By Test Type</button>
        <button className={report === 'inactive' ? 'btn' : 'btn secondary'} onClick={() => setReport('inactive')}>Inactive</button>
      </div>

      {report === 'volume' && (
        <div className="card">
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
        <div className="card">
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

      {report === 'inactive' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Accounts with No Recent Tests</h3>
          <table>
            <thead><tr><th>Clinic</th><th>City</th><th>Last Test</th></tr></thead>
            <tbody>
              {clinics.filter(c => !tests.some(t => t.clinic_id === c.id)).slice(0, 25).map(c => (
                <tr key={c.id}><td>{c.name}</td><td>{c.city || '—'}</td><td>Never</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
