import { useState } from 'react'

function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${m}-${day}-${y}`
}

function formatName(name) {
  if (!name) return '—'
  const parts = name.split(',').map(p => p.trim())
  if (parts.length === 3) return parts[0] + ', ' + parts[2] + ', ' + parts[1]
  return name
}

export default function DashboardHome({ clinics = [], providers = [], tests = [], selectedReps = [], reps = [], onSelectClinic, onSelectProvider, setPage }) {
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [testPage, setTestPage] = useState(0)
  const [attentionPage, setAttentionPage] = useState(0)

  const filteredClinics = selectedReps?.length > 0 ? clinics.filter(c => selectedReps.includes(c.rep_id)) : clinics
  const filteredProviders = selectedReps?.length > 0 ? providers.filter(p => filteredClinics.some(c => c.id === p.clinic_id)) : providers
  const filteredTests = selectedReps?.length > 0 ? tests.filter(t => filteredClinics.some(c => c.id === t.clinic_id)) : tests

  const earliestDate = '2026-01-31'
  const latestDate = new Date().toISOString().split('T')[0]
  const startDate = (dateRange.start || earliestDate).split('T')[0]
  const endDate = (dateRange.end || latestDate).split('T')[0]

  const dateFilteredTests = filteredTests.filter(t => {
    const d = t.collected_at || t.collected
    if (!d) return true
    return d >= startDate && d <= endDate
  })

  const totalTests = dateFilteredTests.length
  const activeAccounts = filteredClinics.filter(c => dateFilteredTests.some(t => t.clinic_id === c.id)).length
  const needAttention = filteredClinics.filter(c => !dateFilteredTests.some(t => t.clinic_id === c.id))

  // Monthly counts
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

  // Tests by panel
  const testCounts = {}
  dateFilteredTests.forEach(t => { testCounts[t.test_type || 'Unknown'] = (testCounts[t.test_type || 'Unknown'] || 0) + 1 })
  const topTests = Object.entries(testCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const pieTotal = topTests.reduce((s, [, v]) => s + v, 0) || 1
  const colors = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  // Top providers
  const providerCounts = {}
  filteredTests.forEach(t => { if (t.provider_id) providerCounts[t.provider_id] = (providerCounts[t.provider_id] || 0) + 1 })
  const topProviders = Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => {
    const p = providers.find(pr => pr.id === id)
    return { ...p, count }
  }).filter(p => p.name)

  // Top accounts
  const accountCounts = {}
  filteredTests.forEach(t => { if (t.clinic_id) accountCounts[t.clinic_id] = (accountCounts[t.clinic_id] || 0) + 1 })
  const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => {
    const c = clinics.find(cl => cl.id === id)
    return { ...c, count }
  }).filter(c => c.name)

  // Recent tests
  const recentTests = dateFilteredTests.slice(testPage * 10, (testPage + 1) * 10)
  const totalTestPages = Math.ceil(dateFilteredTests.length / 10)

  // Attention list
  const attentionList = needAttention.slice(attentionPage * 10, (attentionPage + 1) * 10)
  const totalAttentionPages = Math.ceil(needAttention.length / 10)

  return (
    <div>
      <p style={{ color: '#64748b', marginBottom: 12, fontSize: 14 }}>Data through {new Date().toLocaleDateString()}</p>
      {selectedReps?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}>
          <p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p>
        </div>
      )}

      {/* Date range slider */}
      <div style={{ marginBottom: 16, width: '40%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
          <span>{formatDate(startDate)}</span>
          <span>{formatDate(endDate)}</span>
        </div>
        <div style={{ position: 'relative', height: 20 }}>
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 4, background: '#374151', borderRadius: 2 }}></div>
          <div style={{ position: 'absolute', top: 8, left: `${((new Date(startDate) - new Date(earliestDate)) / (new Date(latestDate) - new Date(earliestDate))) * 100}%`, width: `${Math.max(0, ((new Date(endDate) - new Date(startDate)) / (new Date(latestDate) - new Date(earliestDate))) * 100)}%`, height: 4, background: '#14b8a6', borderRadius: 2 }}></div>
          <div onMouseDown={(e) => { const track = e.currentTarget.parentElement; const rect = track.getBoundingClientRect(); const move = (ev) => { const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)); const d = new Date(new Date(earliestDate).getTime() + x * (new Date(latestDate) - new Date(earliestDate))).toISOString().split('T')[0]; if (d <= endDate) setDateRange({ ...dateRange, start: d }); }; move(e); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} style={{ position: 'absolute', top: 0, left: `${((new Date(startDate) - new Date(earliestDate)) / (new Date(latestDate) - new Date(earliestDate))) * 100}%`, width: 16, height: 16, background: '#fff', border: '2px solid #14b8a6', borderRadius: '50%', cursor: 'pointer', transform: 'translateX(-50%)', zIndex: 2 }}></div>
          <div onMouseDown={(e) => { const track = e.currentTarget.parentElement; const rect = track.getBoundingClientRect(); const move = (ev) => { const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)); const d = new Date(new Date(earliestDate).getTime() + x * (new Date(latestDate) - new Date(earliestDate))).toISOString().split('T')[0]; if (d >= startDate) setDateRange({ ...dateRange, end: d }); }; move(e); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} style={{ position: 'absolute', top: 0, left: `${((new Date(endDate) - new Date(earliestDate)) / (new Date(latestDate) - new Date(earliestDate))) * 100}%`, width: 16, height: 16, background: '#fff', border: '2px solid #14b8a6', borderRadius: '50%', cursor: 'pointer', transform: 'translateX(-50%)', zIndex: 2 }}></div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-value">{totalTests}</div><div className="kpi-label">Tests</div><div className="kpi-change up">↑ Active tracking</div></div>
        <div className="kpi"><div className="kpi-value">{activeAccounts}</div><div className="kpi-label">Active Accounts</div><div className="kpi-change up">{clinics.length} total</div></div>
        <div className="kpi"><div className="kpi-value">{filteredProviders.length}</div><div className="kpi-label">Providers</div></div>
        <div className="kpi"><div className="kpi-value" style={{ color: needAttention.length > 0 ? '#ef4444' : '#10b981' }}>{needAttention.length}</div><div className="kpi-label">Need Attention</div><div className="kpi-change down">No recent tests</div></div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Monthly Testing Volume</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 8 }}>
            {months.map(m => (
              <div key={m} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => {
                const mm = monthMap[m]
                const year = '2026'
                const start = `${year}-${mm}-01`
                const lastDay = new Date(year, parseInt(mm), 0).getDate()
                const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
                setDateRange({ start, end })
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{monthlyCounts[m]}</div>
                <div style={{ height: `${Math.max(20, (monthlyCounts[m] / maxCount) * 120)}px`, background: 'linear-gradient(to top, #0d9488, #14b8a6)', borderRadius: '4px 4px 0 0' }}></div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests by Panel</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: pieTotal > 0 ? `conic-gradient(${topTests.map(([t, c], i) => { const start = topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) / pieTotal * 360; const end = (topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) + c) / pieTotal * 360; return `${colors[i]} ${start}deg ${end}deg`; }).join(', ')})` : '#374151' }}></div>
            <div style={{ flex: 1 }}>
              {topTests.map(([t, c], i) => (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[i], marginRight: 6 }}></span>{t}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Providers</h3>
          {topProviders.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer' }} onClick={() => onSelectProvider && onSelectProvider(p)}>
              <span style={{ color: '#14b8a6', fontSize: 13 }}>{formatName(p.name)}</span>
              <span style={{ fontSize: 13 }}>{p.count}</span>
            </div>
          ))}
          {!topProviders.length && <p style={{ color: '#6b7280', fontSize: 13 }}>No data</p>}
        </div>
      </div>

      {/* Recent activity + attention */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Recent Testing Activity</h3>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>ACCESSION</th><th>COLLECTED</th><th>TEST</th><th>PROVIDER</th><th>PRACTICE</th></tr></thead>
            <tbody>
              {recentTests.map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{t.collected_at || t.collected || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                  <td style={{ color: '#14b8a6' }}>{formatName(t.provider_name) || '—'}</td>
                  <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => { const c = clinics.find(cl => cl.id === t.clinic_id); if (c && onSelectClinic) onSelectClinic(c); }}>{clinics.find(c => c.id === t.clinic_id)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentTests.length && <p style={{ color: '#6b7280' }}>No recent tests</p>}
          {totalTestPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn secondary" disabled={testPage === 0} onClick={() => setTestPage(testPage - 1)}>←</button>
              <span style={{ padding: '6px 8px', fontSize: 13 }}>{testPage * 10 + 1}-{Math.min((testPage + 1) * 10, dateFilteredTests.length)}</span>
              <button className="btn secondary" disabled={testPage >= totalTestPages - 1} onClick={() => setTestPage(testPage + 1)}>→</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Accounts Needing Attention</h3>
          {attentionList.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer' }} onClick={() => onSelectClinic && onSelectClinic(c)}>
              <span style={{ color: '#14b8a6', fontSize: 13 }}>{c.name}</span>
              <span style={{ color: '#ef4444', fontSize: 13 }}>30+</span>
            </div>
          ))}
          {!attentionList.length && <p style={{ color: '#10b981', fontSize: 13 }}>All accounts active</p>}
          {totalAttentionPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn secondary" disabled={attentionPage === 0} onClick={() => setAttentionPage(attentionPage - 1)}>←</button>
              <span style={{ padding: '6px 8px', fontSize: 13 }}>{attentionPage * 10 + 1}-{Math.min((attentionPage + 1) * 10, needAttention.length)}</span>
              <button className="btn secondary" disabled={attentionPage >= totalAttentionPages - 1} onClick={() => setAttentionPage(attentionPage + 1)}>→</button>
            </div>
          )}
        </div>
      </div>

      {/* Top accounts + performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Performing Accounts</h3>
          {topAccounts.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer' }} onClick={() => onSelectClinic && onSelectClinic(c)}>
              <span style={{ color: '#14b8a6', fontSize: 13 }}>{c.name}</span>
              <span style={{ fontSize: 13 }}>{c.count}</span>
            </div>
          ))}
          {!topAccounts.length && <p style={{ color: '#6b7280', fontSize: 13 }}>No data</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Manager Performance</h3>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Coming soon</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Rep Performance</h3>
          {reps.slice(0, 6).map(r => {
            const count = filteredTests.filter(t => clinics.find(c => c.id === t.clinic_id)?.rep_id === r.id).length
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ fontSize: 13 }}>{r.full_name}</span>
                <span style={{ fontSize: 13 }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
