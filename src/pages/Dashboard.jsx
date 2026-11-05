
function testBelongsToClinic(t, clinic) {
  if (!t || !clinic) return false
  return t.clinic_id === clinic.id
}

function formatName(name) {
  if (!name) return '—'
  const parts = name.split(',').map(p => p.trim())
  if (parts.length === 3) return parts[0] + ', ' + parts[2] + ', ' + parts[1]
  return name
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [clinics, setClinics] = useState([])
  const [providers, setProviders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [activities, setActivities] = useState([])
  const [followups, setFollowups] = useState([])
  const [tests, setTests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState('dashboard')
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [selectedReps, setSelectedReps] = useState([])
  const [reps, setReps] = useState([])

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadProfile() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).single()
    console.log('Profile load:', data, error)
    setProfile(data || { role: 'rep', full_name: session.user.email })
  }

  async function loadData() {
    const [c, p, e, testData] = await Promise.all([
      supabase.from('clinics').select('*').order('name'),
      supabase.from('providers').select('*, clinics(name)').order('name'),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('tests').select('*').order('collected_at', { ascending: false }).limit(10000)
    ])
    setClinics(c.data || [])
    setProviders(p.data || [])
    setExpenses(e.data || [])
    setTests(testData.data || [])
    if (testData.data?.[0]) console.log('Sample test:', testData.data[0])
    const { data: repsData } = await supabase.from('profiles').select('*').eq('role', 'rep')
    setReps(repsData || [])
  }

  const role = profile?.role || 'rep'
  const roleLabel = { global_admin: 'Global Admin', manager: 'Manager', rep: 'Rep' }[role] || 'Rep'

  const allNav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'prospects', label: 'Prospects' },
    ...(role === 'global_admin' ? [{ id: 'approve', label: 'Approve Accounts' }] : []),
    { id: 'providers', label: 'Providers' },
    ...(role === 'manager' || role === 'global_admin' ? [{ id: 'reps', label: 'Reps' }] : []),
    ...(role === 'global_admin' ? [{ id: 'managers', label: 'Managers' }] : []),
    { id: 'tests', label: 'Tests' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'reports', label: 'Reports' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'training', label: 'Training' },
    { id: 'users', label: 'Users', adminOnly: true }
  ]
  const nav = allNav.filter(n => !n.adminOnly || role === 'global_admin')

  if (!profile) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: 220, background: '#111827', padding: '20px 12px', borderRight: '1px solid #1f2937' }}>
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <img src="/logo.png" alt="Response DX" style={{ height: 40, marginBottom: 4 }} />
        </div>
        <div style={{ padding: '4px 12px', marginBottom: 16 }}>
          <span style={{ background: '#0d9488', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
        </div>
        {nav.map(n => (
          <div key={n.id} onClick={() => { setPage(n.id); setSelectedClinic(null); setSelectedProvider(null) }} 
            style={{ padding: '10px 16px', cursor: 'pointer', borderRadius: 8, marginBottom: 4, background: page === n.id && !selectedClinic ? '#0d9488' : 'transparent', fontSize: 14 }}>
            {n.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 28, background: '#0b1220', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>
            {selectedProvider?.name || selectedClinic?.name || nav.find(n => n.id === page)?.label}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ position: 'relative', cursor: 'pointer', marginRight: 8 }} onClick={() => setPage('notifications')}>
              🔔 {notifications.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifications.length}</span>}
            </span>
            <span style={{ fontSize: 14, color: '#9ca3af' }}>{profile.full_name || session.user.email}</span>
            <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Log Out</button>
          </div>
        </div>
        
        {page === 'dashboard' && <DashboardHome clinics={clinics} expenses={expenses} providers={providers} tests={tests} selectedReps={selectedReps} reps={reps} onSelectClinic={setSelectedClinic} />}
        {page === 'approve' && role === 'global_admin' && <ApproveAccounts clinics={clinics} onRefresh={loadData} />}
        {page === 'prospects' && !selectedClinic && <Prospects clinics={clinics} onRefresh={loadData} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} />}
        {page === 'prospects' && selectedClinic && <ClinicDetail clinic={selectedClinic} providers={providers.filter(p => p.clinic_id === selectedClinic.id)} tests={tests.filter(t => t.clinic_id === selectedClinic.id)} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} isProspect={true} />}
        {page === 'accounts' && !selectedClinic && <Accounts clinics={clinics} tests={tests} onRefresh={loadData} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} />}
        {page === 'accounts' && selectedClinic && !selectedProvider && (
          <ClinicDetail clinic={selectedClinic} providers={providers.filter(p => p.clinic_id === selectedClinic.id)} tests={tests.filter(t => t.clinic_id === selectedClinic.id)} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} />
        )}
        {selectedProvider && <ProviderDetail provider={selectedProvider} onBack={() => setSelectedProvider(null)} />}
        {page === 'tests' && <Tests tests={tests} clinics={clinics} providers={providers} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} selectedReps={selectedReps} reps={reps} />}
        {page === 'providers' && !selectedProvider && <Providers providers={providers} clinics={clinics} tests={tests} onSelect={setSelectedProvider} onSelectClinic={setSelectedClinic} selectedReps={selectedReps} reps={reps} />}
        {page === 'reps' && <RepsList selected={selectedReps} setSelected={setSelectedReps} clinics={clinics} tests={tests} />}
          {page === 'managers' && <ManagersList />}
        {page === 'expenses' && <Expenses expenses={expenses} clinics={clinics} providers={providers} onRefresh={loadData} role={role} />}
        {page === 'reports' && <Reports clinics={clinics} tests={tests} providers={providers} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} selectedReps={selectedReps} reps={reps} />}
        {page === 'notifications' && <Notifications items={notifications} />}
        {page === 'followups' && <Followups clinics={clinics} />}
        {page === 'training' && <Training role={role} />}
        {page === 'users' && role === 'global_admin' && <Users />}
      </div>
    </div>
  )
}

function DashboardHome({ clinics, expenses, providers, tests, selectedReps, reps, onSelectClinic }) {
  const filteredClinics = selectedReps?.length > 0 ? clinics.filter(c => selectedReps.includes(c.rep_id)) : clinics
  const filteredProviders = selectedReps?.length > 0 ? providers.filter(p => filteredClinics.some(c => c.id === p.clinic_id)) : providers
  const filteredTests = selectedReps?.length > 0 ? tests.filter(t => filteredClinics.some(c => c.id === t.clinic_id)) : tests
  const filtered = selectedReps?.length > 0
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [testPage, setTestPage] = useState(0)
  const [attentionPage, setAttentionPage] = useState(0)
  const earliestDate = (filteredTests || []).reduce((min, t) => { const d = (t.collected_at || t.collected || '').split('T')[0]; return d && d > '2020-01-01' && (!min || d < min) ? d : min }, null)
  const latestDate = new Date().toISOString().split('T')[0]
  const startDate = (dateRange.start || earliestDate || '2020-01-01').split('T')[0]
  const endDate = (dateRange.end || latestDate).split('T')[0]
  const dateFilteredTests = (filteredTests || []).filter(t => {
    const d = t.collected_at || t.collected
    if (!d) return true
    return d >= startDate && d <= endDate
  })
  const totalTests = dateFilteredTests.length
  const activeAccounts = filteredClinics.filter(c => dateFilteredTests.some(t => testBelongsToClinic(t, c))).length
  const activeProviders = filteredProviders.filter(p => dateFilteredTests.some(t => (t.provider_name || '').toLowerCase().includes((p.name || '').toLowerCase().split(',')[0]))).length
  const needAttention = filteredClinics.filter(c => !dateFilteredTests.some(t => testBelongsToClinic(t, c))).length
  const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct']
  const monthMap = { Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10' }
  const monthlyCounts = {}
  months.forEach(m => { monthlyCounts[m] = 0 })
  ;(filteredTests || []).forEach(t => {
    if (t.collected) {
      const month = t.collected.substring(5, 7)
      const monthName = Object.entries(monthMap).find(([k, v]) => v === month)?.[0]
      if (monthName) monthlyCounts[monthName]++
    }
  })
  const maxCount = Math.max(...Object.values(monthlyCounts), 1)
  
  // Count tests by type (filtered by date range)
  const testCounts = {}
  ;(filteredTests || []).filter(t => {
    const d = t.collected_at || t.collected
    if (!d) return true
    return d >= startDate && d <= endDate
  }).forEach(t => { testCounts[t.test_type] = (testCounts[t.test_type] || 0) + 1 })
  const topTests = Object.entries(testCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  
  // Top providers by test count
  const providerCounts = {}
  ;(filteredTests || []).forEach(t => { if (t.provider_id) providerCounts[t.provider_id] = (providerCounts[t.provider_id] || 0) + 1 })
  const topProviders = Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => {
    const p = providers.find(pr => pr.id === id)
    return { name: p?.name || 'Unknown', count }
  })
  
  // Top accounts by test count
  const accountCounts = {}
  ;(filteredTests || []).forEach(t => {
    const c = clinics.find(cl => testBelongsToClinic(t, cl))
    if (c) accountCounts[c.id] = (accountCounts[c.id] || 0) + 1
  })
  const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => {
    const c = clinics.find(cl => cl.id === id)
    return { name: c?.name || 'Unknown', count }
  })

  return (
    <div>
      <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>Data through {new Date().toLocaleDateString()}</p>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div style={{ marginBottom: 16, width: 'calc(40% - 8px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
          <span>{formatDate(startDate)}</span>
          <span>{formatDate(endDate)}</span>
        </div>
        <input type="range" min={earliestDate || '2020-01-01'} max={latestDate} value={startDate} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: '100%', accentColor: '#14b8a6' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input type="date" value={startDate} min={earliestDate || '2020-01-01'} max={endDate} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ flex: 1, background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, padding: '4px 8px' }} />
          <input type="date" value={endDate} min={startDate} max={latestDate} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={{ flex: 1, background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: 4, padding: '4px 8px' }} />
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-value">{totalTests}</div><div className="kpi-label">Tests</div><div className="kpi-change up">↑ Active tracking</div></div>
        <div className="kpi"><div className="kpi-value">{activeAccounts}</div><div className="kpi-label">Active Accounts</div><div className="kpi-change up">{clinics.length} total</div></div>
        <div className="kpi"><div className="kpi-value">{providers.length}</div><div className="kpi-label">Providers</div></div>
        <div className="kpi"><div className="kpi-value">${(totalTests * 125).toLocaleString()}</div><div className="kpi-label">Est. Revenue</div><div className="kpi-change up">$125/test</div></div>
        <div className="kpi"><div className="kpi-value" style={{ color: needAttention > 0 ? '#ef4444' : '#10b981' }}>{needAttention}</div><div className="kpi-label">Need Attention</div><div className="kpi-change down">No recent tests</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Monthly Testing Volume</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 8 }}>
            {months.map(m => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>
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
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: `conic-gradient(${topTests.map(([t, c], i) => { const total = topTests.reduce((s, [,v]) => s + v, 0); const start = topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) / total * 360; const end = (topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) + c) / total * 360; const colors = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']; return `${colors[i % colors.length]} ${start}deg ${end}deg`; }).join(', ')})` }}></div>
            <div style={{ flex: 1 }}>
              {topTests.map(([type, count], i) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5], marginRight: 6 }}></span>{type}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          {!topTests.length && <p style={{ color: '#6b7280' }}>No tests yet</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Providers</h3>
          {topProviders.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
              <span style={{ color: '#14b8a6' }}>{formatName(p.name)}</span><span>{p.count}</span>
            </div>
          ))}
          {!topProviders.length && <p style={{ color: '#6b7280' }}>No data yet</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Recent Testing Activity</h3>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Accession</th><th>Collected</th><th>Test</th><th>Practice</th></tr></thead>
            <tbody>
              {(tests || []).sort((a, b) => new Date(b.collected_at || b.collected || 0) - new Date(a.collected_at || a.collected || 0)).slice(testPage * 10, (testPage + 1) * 10).map(t => (
                <tr key={t.id}>
                  <td>{t.accession}</td>
                  <td>{formatDate(t.collected_at || t.collected || t.collected_date)}</td>
                  <td style={{ color: '#14b8a6' }}>{t.test_type || t.panel || '—'}</td>
                  <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => { const c = clinics.find(cl => cl.id === t.clinic_id); if (c) onSelectClinic(c) }}>{clinics.find(c => c.id === t.clinic_id)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(tests || []).length && <p style={{ color: '#6b7280' }}>No tests yet</p>}
          {(tests || []).length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTestPage(Math.max(0, testPage - 1))} disabled={testPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{testPage * 10 + 1}-{Math.min((testPage + 1) * 10, tests.length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setTestPage(testPage + 1)} disabled={(testPage + 1) * 10 >= tests.length}>→</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Accounts Needing Attention</h3>
          {clinics.filter(c => !(tests || []).some(t => t.clinic_id === c.id)).slice(attentionPage * 10, (attentionPage + 1) * 10).map(c => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#14b8a6' }}>{c.name}</span><span style={{ color: '#ef4444' }}>30+</span>
            </div>
          ))}
          {clinics.filter(c => !(tests || []).some(t => t.clinic_id === c.id)).length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setAttentionPage(Math.max(0, attentionPage - 1))} disabled={attentionPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{attentionPage * 10 + 1}-{Math.min((attentionPage + 1) * 10, clinics.filter(c => !(tests || []).some(t => t.clinic_id === c.id)).length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setAttentionPage(attentionPage + 1)} disabled={(attentionPage + 1) * 10 >= clinics.filter(c => !(tests || []).some(t => t.clinic_id === c.id)).length}>→</button>
            </div>
          )}
        </div>
        
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Performing Accounts</h3>
          {topAccounts.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
              <span style={{ color: '#14b8a6' }}>{a.name}</span><span>{a.count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Manager Performance</h3>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Total tests from assigned reps</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Rep Performance</h3>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Total tests by rep</p>
        </div>
      </div>
    </div>
  )
}



function ApproveAccounts({ clinics, onRefresh }) {
  const pending = clinics.filter(c => c.is_prospect && c.stage === 'Pending')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ supplyUrl: '', pickupUrl: '' })

  async function approve() {
    if (!selected) return
    await supabase.from('clinics').update({ 
      is_prospect: false, 
      stage: 'Active',
      supply_url: form.supplyUrl,
      pickup_url: form.pickupUrl
    }).eq('id', selected.id)
    setSelected(null)
    setForm({ supplyUrl: '', pickupUrl: '' })
    onRefresh()
    alert('Account approved!')
  }

  if (selected) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Approve: {selected.name}</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Custom Supply URL</label>
          <input value={form.supplyUrl} onChange={e => setForm({...form, supplyUrl: e.target.value})} placeholder="https://..." style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Custom Pickup URL</label>
          <input value={form.pickupUrl} onChange={e => setForm({...form, pickupUrl: e.target.value})} placeholder="https://..." style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Upload Requisition (PDF)</label>
          <input type="file" accept=".pdf" style={{ display: 'block', marginTop: 4 }} />
        </div>
        <button className="btn" onClick={approve}>Approve Account</button>
        <button className="btn secondary" onClick={() => setSelected(null)} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Pending Approvals</h2>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map(p => (
              <tr key={p.id}>
                <td>{formatName(p.name)}</td>
                <td>{p.type || '—'}</td>
                <td>{p.city || '—'}</td>
                <td><button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelected(p)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pending.length && <p style={{ color: '#6b7280', padding: 12 }}>No pending approvals.</p>}
      </div>
    </div>
  )
}

function Prospects({ clinics, onRefresh, onSelect, selectedReps = [], reps = [] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '', stage: 'Cold' })
  const [providers, setProviders] = useState([{ name: '', title: 'MD', npi: '' }])
  const [ordering, setOrdering] = useState(null)
  const [supplies, setSupplies] = useState({ reqs: 'yes', wound: 0, uti: 0, rpp: 0, synovi: 0, labels: 'FedEx', labelQty: 0, bags: 0 })
  const allProspects = clinics.filter(c => c.is_prospect)
  const prospects = selectedReps?.length > 0 ? allProspects.filter(c => selectedReps.includes(c.rep_id)) : allProspects

  async function addProspect() {
    if (!form.name.trim()) return
    const { data: clinic } = await supabase.from('clinics').insert({ ...form, is_prospect: true }).select().single()
    if (clinic) {
      for (const p of providers) {
        if (p.name.trim()) {
          await supabase.from('providers').insert({ ...p, clinic_id: clinic.id })
        }
      }
    }
    setForm({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '', stage: 'Cold' })
    setProviders([{ name: '', title: 'MD', npi: '' }])
    setShowAdd(false)
    onRefresh()
  }

  async function convertToAccount(id) {
    await supabase.from('clinics').update({ is_prospect: false }).eq('id', id)
    onRefresh()
    alert('Converted to Account! Rep will be notified.')
  }

  async function updateStage(id, stage) {
    await supabase.from('clinics').update({ stage }).eq('id', id)
    onRefresh()
  }

  const stageColor = { Cold: '#6b7280', Warm: '#f59e0b', HOT: '#ef4444' }

  async function submitOrder() {
    if (!ordering) return
    await supabase.from('clinics').update({ stage: 'Pending' }).eq('id', ordering.id)
    
    const orderDetails = `
Clinic: ${ordering.name}
Type: ${ordering.type || 'N/A'}
City: ${ordering.city || 'N/A'}
Phone: ${ordering.phone || 'N/A'}

Supplies Requested:
- Requisitions: ${supplies.reqs}
- Wound kits: ${supplies.wound}
- UTI kits: ${supplies.uti}
- RPP kits: ${supplies.rpp}
- SynoviFact: ${supplies.synovi}
- Shipping: ${supplies.labels} x${supplies.labelQty}
- Bags: ${supplies.bags}
    `
    
    try {
      await fetch('/.netlify/functions/sendemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'spud.w.mann@gmail.com',
          subject: 'New Order Request: ' + ordering.name,
          text: orderDetails
        })
      })
    } catch (e) { console.log('Email error', e) }
    
    alert('Order submitted! Pending Global Admin approval.')
    setOrdering(null)
    onRefresh()
  }

  if (ordering) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Ready to Order: {ordering.name}</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Requisitions with kits?</label>
          <select value={supplies.reqs} onChange={e => setSupplies({...supplies, reqs: e.target.value})} style={{ marginLeft: 8 }}>
            <option value="yes">Yes</option><option value="no">No</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label>RDX Wound kits</label><input type="number" min="0" max="25" value={supplies.wound} onChange={e => setSupplies({...supplies, wound: e.target.value})} /></div>
          <div><label>RDX UTI/UTI Plus</label><input type="number" min="0" max="25" value={supplies.uti} onChange={e => setSupplies({...supplies, uti: e.target.value})} /></div>
          <div><label>RDX RPP</label><input type="number" min="0" max="25" value={supplies.rpp} onChange={e => setSupplies({...supplies, rpp: e.target.value})} /></div>
          <div><label>RDX SynoviFact</label><input type="number" min="0" max="25" value={supplies.synovi} onChange={e => setSupplies({...supplies, synovi: e.target.value})} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Return Shipping Labels</label>
          <select value={supplies.labels} onChange={e => setSupplies({...supplies, labels: e.target.value})} style={{ marginLeft: 8 }}>
            <option>FedEx</option><option>UPS</option>
          </select>
          <input type="number" min="0" max="25" value={supplies.labelQty} onChange={e => setSupplies({...supplies, labelQty: e.target.value})} placeholder="Qty" style={{ marginLeft: 8, width: 80 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Return Shipping Bags</label>
          <input type="number" min="0" max="25" value={supplies.bags} onChange={e => setSupplies({...supplies, bags: e.target.value})} style={{ marginLeft: 8, width: 80 }} />
        </div>
        <button className="btn" onClick={submitOrder}>Submit Order</button>
        <button className="btn secondary" onClick={() => setOrdering(null)} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    )
  }

  return (
    <div>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <button className="btn" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>+ Add Prospect</button>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>New Prospect</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Clinic name *" />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option>Orthopedic</option><option>Hospital</option><option>Wound Care</option><option>Podiatry</option><option>SNF</option><option>Urology</option><option>Multi-specialty</option>
            </select>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street address" style={{ gridColumn: 'span 2' }} />
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" />
            <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="State" />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" />
            <input value={form.fax} onChange={e => setForm({...form, fax: e.target.value})} placeholder="Fax" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" />
            <input value={form.emr} onChange={e => setForm({...form, emr: e.target.value})} placeholder="EMR system" />
            <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
              <option>Cold</option><option>Warm</option><option>HOT</option>
            </select>
          </div>
          <h4 style={{ marginBottom: 8 }}>Providers</h4>
          {providers.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto', gap: 8, marginBottom: 8 }}>
              <input value={formatName(p.name)} onChange={e => { const n = [...providers]; n[i].name = e.target.value; setProviders(n) }} placeholder="Name" />
              <select value={p.title} onChange={e => { const n = [...providers]; n[i].title = e.target.value; setProviders(n) }}><option>MD</option><option>DO</option><option>NP</option><option>PA</option><option>DPM</option></select>
              <input value={p.npi} onChange={e => { const n = [...providers]; n[i].npi = e.target.value; setProviders(n) }} placeholder="NPI" />
              <button className="btn secondary" onClick={() => setProviders(providers.filter((_, j) => j !== i))} style={{ padding: '8px 12px' }}>−</button>
            </div>
          ))}
          <button className="btn secondary" onClick={() => setProviders([...providers, { name: '', title: 'MD', npi: '' }])} style={{ marginBottom: 12 }}>+ Add Provider</button>
          <button className="btn" onClick={addProspect}>Save Prospect</button>
          <button className="btn secondary" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Stage</th><th>Actions</th></tr></thead>
          <tbody>
            {prospects.map(p => (
              <tr key={p.id} onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#14b8a6' }}>{formatName(p.name)}</td>
                <td>{p.type || '—'}</td>
                <td>{p.city || '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <select value={p.stage || 'Cold'} onChange={e => updateStage(p.id, e.target.value)} style={{ background: stageColor[p.stage] || '#6b7280', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }}>
                    <option>Cold</option><option>Warm</option><option>HOT</option>
                  </select>
                </td>
                <td onClick={e => e.stopPropagation()}><button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setOrdering(p)}>Ready to Order</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!prospects.length && <p style={{ color: '#6b7280', padding: 12 }}>No prospects yet.</p>}
      </div>
    </div>
  )
}



function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return d
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return m + '-' + day + '-' + y
}

function formatPhone(p) {
  if (!p) return '—'
  const n = String(p).replace(/[^0-9]/g, '')
  if (n.length === 10) return n.slice(0,3) + '-' + n.slice(3,6) + '-' + n.slice(6)
  if (n.length === 11 && n[0] === '1') return n.slice(1,4) + '-' + n.slice(4,7) + '-' + n.slice(7)
  return n || '—'
}

function Accounts({ clinics, tests, onRefresh, onSelect, selectedReps = [], reps = [] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [accountSort, setAccountSort] = useState('az')
  const [routeMode, setRouteMode] = useState(false)
  const [showRoutePopup, setShowRoutePopup] = useState(false)
  const [routeAccounts, setRouteAccounts] = useState([])
  const [routeStart, setRouteStart] = useState('home')
  const [customStart, setCustomStart] = useState('')
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '' })
  const baseClinics = selectedReps?.length > 0 ? clinics.filter(c => selectedReps.includes(c.rep_id)) : clinics
  const filtered = [...baseClinics].filter(c => c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (accountSort === 'az') return (a.name || '').localeCompare(b.name || '')
    if (accountSort === 'tests') {
      const aCount = (tests || []).filter(t => t.clinic_id === a.id).length
      const bCount = (tests || []).filter(t => t.clinic_id === b.id).length
      return bCount - aCount
    }
    if (accountSort === 'date') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    return 0
  })

  async function addClinic() {
    if (!form.name.trim()) return
    await supabase.from('clinics').insert(form)
    setShowAdd(false)
    setForm({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '' })
    onRefresh()
  }

  return (
    <div>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Add Account</button>
        <button className="btn secondary" onClick={() => { setShowRoutePopup(true); setRouteMode(true) }}>Build Route</button>
        {routeMode && routeAccounts.length > 0 && (
          <button className="btn" onClick={() => {
            const selected = clinics.filter(c => routeAccounts.includes(c.id))
            const addresses = selected.map(c => encodeURIComponent([c.address, c.city, c.state].filter(Boolean).join(', '))).filter(a => a)
            if (!addresses.length) return alert('Selected accounts have no addresses')
            const origin = routeStart === 'other' && customStart ? encodeURIComponent(customStart) : ''
            const url = origin ? `https://www.google.com/maps/dir/${origin}/${addresses.join('/')}` : `https://www.google.com/maps/dir/${addresses.join('/')}`
            window.open(url, '_blank')
            setRouteMode(false)
            setRouteAccounts([])
          }}>Make Route ({routeAccounts.length})</button>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." style={{ flex: 1, maxWidth: 280 }} />
        <select className="form-input" style={{ width: 160 }} onChange={(e) => setAccountSort(e.target.value)} value={accountSort || 'az'}>
          <option value="az">A-Z</option>
          <option value="tests">Total Tests</option>
          <option value="date">Date Added</option>
        </select>
      </div>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>New Account</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Clinic name *" />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option>Orthopedic</option><option>Hospital</option><option>Wound Care</option><option>Podiatry</option><option>SNF</option><option>Urology</option><option>Multi-specialty</option>
            </select>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street address" style={{ gridColumn: 'span 2' }} />
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" />
            <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="State" />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" />
            <input value={form.fax} onChange={e => setForm({...form, fax: e.target.value})} placeholder="Fax" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" />
            <input value={form.emr} onChange={e => setForm({...form, emr: e.target.value})} placeholder="EMR system" />
          </div>
          <button className="btn" onClick={addClinic}>Save Account</button>
          <button className="btn secondary" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      {showRoutePopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowRoutePopup(false)}>
          <div style={{ background: '#1f2937', borderRadius: 12, padding: 24, width: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Build Route</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>Starting location</div>
              <label style={{ display: 'block', marginBottom: 6 }}><input type="radio" checked={routeStart === 'home'} onChange={() => setRouteStart('home')} /> Home</label>
              <label style={{ display: 'block', marginBottom: 6 }}><input type="radio" checked={routeStart === 'other'} onChange={() => setRouteStart('other')} /> Other address</label>
              {routeStart === 'other' && <input value={customStart} onChange={e => setCustomStart(e.target.value)} placeholder="Enter address" style={{ width: '100%', marginTop: 4 }} />}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setShowRoutePopup(false)}>Start Selecting</button>
              <button className="btn secondary" onClick={() => { setShowRoutePopup(false); setRouteMode(false); setRouteAccounts([]) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(c => (
          <div key={c.id} className="card" onClick={() => routeMode ? setRouteAccounts(routeAccounts.includes(c.id) ? routeAccounts.filter(id => id !== c.id) : [...routeAccounts, c.id]) : onSelect(c)} style={{ cursor: 'pointer', padding: 16, border: (() => {
              const hasSynovi = (tests || []).some(t => testBelongsToClinic(t, c) && (t.panel || '').toLowerCase().includes('synovi'))
              const recentSynovi = (tests || []).some(t => testBelongsToClinic(t, c) && (t.panel || '').toLowerCase().includes('synovi') && new Date(t.collected_at || 0) > new Date(Date.now() - 15 * 24 * 60 * 60 * 1000))
              if (hasSynovi && !recentSynovi) return '2px solid #f97316'
              if (routeAccounts.includes(c.id)) return '2px solid #14b8a6'
              return '1px solid #1f2937'
            })() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: 16, color: '#14b8a6', margin: 0 }}>{routeMode && (routeAccounts.includes(c.id) ? '✓ ' : '○ ')}{c.name}</h3>
              <span className="badge" style={{ background: (tests || []).some(t => testBelongsToClinic(t, c)) ? '#a7f3d0' : '#fecaca', color: '#000' }}>{(tests || []).some(t => testBelongsToClinic(t, c)) ? 'Active' : 'Inactive'}</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0' }}>{c.address || '—'}</p>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0' }}>{c.city || '—'}{c.state ? ', ' + c.state : ''}</p>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0' }}>{formatPhone(c.phone)}</p>
          </div>
        ))}
      </div>
      {!filtered.length && <p style={{ color: '#6b7280', padding: 12 }}>No accounts found.</p>}
    </div>
  )
}

function ClinicDetail({ clinic, providers, tests, onBack, onRefresh, onSelectProvider, isProspect }) {
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('info')
  const [prov, setProv] = useState({ name: '', title: 'MD', npi: '', email: '', phone: '' })
  const [note, setNote] = useState('')
  const [activityType, setActivityType] = useState('Note')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...clinic })
  const [showFollowup, setShowFollowup] = useState(false)
  const [followup, setFollowup] = useState({ date: '', hour: '9', minute: '00', ampm: 'AM', type: 'Call', warn: '1 day' })

  async function addProvider() {
    if (!prov.name.trim()) return
    await supabase.from('providers').insert({ ...prov, clinic_id: clinic.id })
    setProv({ name: '', title: 'MD', npi: '', email: '', phone: '' })
    setShowAdd(false)
    onRefresh()
  }

  async function addActivity() {
    if (!note.trim()) return
    const timestamp = new Date().toLocaleString()
    const newNote = `[${timestamp}] ${activityType}: ${note}`
    const updated = clinic.notes ? `${newNote}\n${clinic.notes}` : newNote
    await supabase.from('clinics').update({ notes: updated }).eq('id', clinic.id)
    setNote('')
    onRefresh()
    clinic.notes = updated
    setShowFollowup(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancel Edit' : 'Edit'}</button>
        {!isProspect && <a href={clinic.supplies_url || 'https://www.responsedx.net/request-supplies'} target="_blank" rel="noreferrer" className="btn">Request Supplies</a>}
        {!isProspect && <a href={clinic.ordering_url || 'https://www.responsedx.net/copy-of-request-an-account'} target="_blank" rel="noreferrer" className="btn">Request Pickup</a>}
        <a href={'https://www.google.com/maps/search/catering+near+' + encodeURIComponent(clinic.address || clinic.city || '')} target="_blank" rel="noreferrer" className="btn">Find Catering</a>
        {!isProspect && <button className="btn secondary">Requisition Form ▾</button>}
      </div>
      {editing && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Edit {isProspect ? 'Prospect' : 'Account'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
            <select value={editForm.type || ''} onChange={e => setEditForm({...editForm, type: e.target.value})}>
              <option>Orthopedic</option><option>Hospital</option><option>Wound Care</option><option>Podiatry</option><option>SNF</option><option>Urology</option><option>Multi-specialty</option>
            </select>
            <input value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Address" style={{ gridColumn: 'span 2' }} />
            <input value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="City" />
            <input value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} placeholder="State" />
            <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone" />
            <input value={editForm.fax || ''} onChange={e => setEditForm({...editForm, fax: e.target.value})} placeholder="Fax" />
            <input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email" />
            <input value={editForm.emr || ''} onChange={e => setEditForm({...editForm, emr: e.target.value})} placeholder="EMR" />
            <input value={editForm.ordering_url || ''} onChange={e => setEditForm({...editForm, ordering_url: e.target.value})} placeholder="Custom Ordering URL" style={{ gridColumn: 'span 2' }} />
            <input value={editForm.supplies_url || ''} onChange={e => setEditForm({...editForm, supplies_url: e.target.value})} placeholder="Custom Supplies URL" style={{ gridColumn: 'span 2' }} />
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Upload Requisition</label>
              <input type="file" onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                const path = 'requisitions/' + clinic.id + '/' + Date.now() + '-' + file.name
                const { error } = await supabase.storage.from('docs').upload(path, file)
                if (error) return alert(error.message)
                setEditForm({...editForm, requisition_url: path })
                alert('Requisition uploaded!')
              }} />
              {editForm.requisition_url && <button className="btn secondary btn-sm" style={{ marginLeft: 8 }} onClick={async () => {
                const { data } = await supabase.storage.from('docs').createSignedUrl(editForm.requisition_url, 60)
                if (data?.signedUrl) window.open(data.signedUrl, '_blank')
              }}>View current</button>}
            </div>
          </div>
          <button className="btn" onClick={async () => {
            await supabase.from('clinics').update(editForm).eq('id', clinic.id)
            setEditing(false)
            onRefresh()
            alert('Saved!')
          }}>Save Changes</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['info', 'providers', 'activity', 'tests'].map(t => (
          <button key={t} className={tab === t ? 'btn' : 'btn secondary'} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>
      
      {tab === 'info' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <p><strong>Type:</strong> {clinic.type || '—'}</p>
            <p><strong>EMR:</strong> {clinic.emr || '—'}</p>
            <p><strong>Ordering URL:</strong> {clinic.ordering_url ? <a href={clinic.ordering_url} target="_blank" rel="noreferrer" style={{ color: '#14b8a6' }}>{clinic.ordering_url}</a> : '—'}</p>
            <p><strong>Supplies URL:</strong> {clinic.supplies_url ? <a href={clinic.supplies_url} target="_blank" rel="noreferrer" style={{ color: '#14b8a6' }}>{clinic.supplies_url}</a> : '—'}</p>
            <p><strong>Requisition:</strong> {clinic.requisition_url ? <button className="btn secondary btn-sm" onClick={async () => {
              const { data } = await supabase.storage.from('docs').createSignedUrl(clinic.requisition_url, 60)
              if (data?.signedUrl) window.open(data.signedUrl, '_blank')
            }}>View PDF</button> : '—'}</p>
            <p><strong>Address:</strong> {clinic.address || '—'}</p>
            {!clinic.address?.includes(clinic.city) && <p><strong>City:</strong> {clinic.city || '—'}</p>}
            <p><strong>Phone:</strong> {String(clinic.phone || '').replace('.0', '') || '—'}</p>
            <p><strong>Fax:</strong> {clinic.fax || '—'}</p>
            <p style={{ gridColumn: 'span 2' }}><strong>Email:</strong> {clinic.email || '—'}</p>
          </div>
        </div>
      )}
      
      {tab === 'providers' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>Providers ({providers.length})</h3>
            <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Add Provider</button>
          </div>
          {showAdd && (
            <div style={{ marginBottom: 12, padding: 12, background: '#0f172a', borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input value={prov.name} onChange={e => setProv({...prov, name: e.target.value})} placeholder="Name *" />
                <select value={prov.title} onChange={e => setProv({...prov, title: e.target.value})}><option>MD</option><option>DO</option><option>NP</option><option>PA</option><option>DPM</option></select>
                <input value={prov.npi} onChange={e => setProv({...prov, npi: e.target.value})} placeholder="NPI" />
                <input value={prov.email} onChange={e => setProv({...prov, email: e.target.value})} placeholder="Email" />
                <input value={prov.phone} onChange={e => setProv({...prov, phone: e.target.value})} placeholder="Phone" />
              </div>
              <button className="btn" onClick={addProvider}>Save Provider</button>
            </div>
          )}
          {providers.map(p => (
            <div key={p.id} onClick={() => onSelectProvider(p)} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <div><span style={{ color: '#14b8a6' }}>{formatName(p.name)}</span> <span style={{ color: '#9ca3af' }}>· {p.title}</span></div>
              <span style={{ color: '#6b7280' }}>{p.npi || ''}</span>
            </div>
          ))}
          {!providers.length && <p style={{ color: '#6b7280' }}>No providers yet.</p>}
        </div>
      )}
      
      {tab === 'activity' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Log Activity</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select value={activityType} onChange={e => setActivityType(e.target.value)}>
              <option>Note</option><option>Phone Call</option><option>Visit</option><option>Email</option><option>Meeting</option>
            </select>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Activity notes..." style={{ flex: 1 }} />
            <button className="btn" onClick={addActivity}>Add</button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: '#9ca3af', fontSize: 14 }}>
            {clinic.notes || 'No activity yet.'}
          </div>
        </div>
      )}
      {tab === 'tests' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests ({(tests || []).length})</h3>
          <table>
            <thead><tr><th>Date</th><th>Accession</th><th>Test</th><th>Status</th></tr></thead>
            <tbody>
              {(tests || []).map(t => (
                <tr key={t.id}>
                  <td>{formatDate(t.collected)}</td>
                  <td>{t.accession || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                  <td><span className="badge" style={{ background: t.finalized ? '#a7f3d0' : '#fef3c7', color: '#000' }}>{t.finalized ? 'Finalized' : 'Pending'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(tests || []).length && <p style={{ color: '#6b7280' }}>No tests for this account yet.</p>}
        </div>
      )}
      {showFollowup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Schedule Follow-up</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Date</label>
              <input type="date" value={followup.date} onChange={e => setFollowup({...followup, date: e.target.value})} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Time</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={followup.hour} onChange={e => setFollowup({...followup, hour: e.target.value})} style={{ flex: 1 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={followup.minute} onChange={e => setFollowup({...followup, minute: e.target.value})} style={{ flex: 1 }}>
                  {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={followup.ampm} onChange={e => setFollowup({...followup, ampm: e.target.value})} style={{ flex: 1 }}>
                  <option>AM</option><option>PM</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Type</label>
              <select value={followup.type} onChange={e => setFollowup({...followup, type: e.target.value})} style={{ width: '100%' }}>
                <option>Call</option><option>Visit</option><option>Email</option><option>Meeting</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Remind me</label>
              <select value={followup.warn} onChange={e => setFollowup({...followup, warn: e.target.value})} style={{ width: '100%' }}>
                <option>15 minutes</option><option>1 hour</option><option>1 day</option>
              </select>
            </div>
            <button className="btn" onClick={async () => {
                const timeStr = followup.hour + ':' + followup.minute + ' ' + followup.ampm
                const { error } = await supabase.from('followups').insert({
                  clinic_id: clinic.id,
                  date: followup.date,
                  time: timeStr,
                  type: followup.type,
                  notes: 'Reminder: ' + followup.warn
                })
                if (error) console.log('Followup error:', error)
                else console.log('Followup saved')
                alert('Follow-up scheduled!')
                setShowFollowup(false)
              }}>Save</button>
            <button className="btn secondary" onClick={() => setShowFollowup(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProviderDetail({ provider, onBack }) {
  return (
    <div>
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>{formatName(provider.name)}, {provider.title}</h3>
        <p style={{ marginBottom: 8 }}><strong>NPI:</strong> {provider.npi || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Email:</strong> {provider.email || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Phone:</strong> {provider.phone || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Clinic:</strong> {provider.clinics?.name || '—'}</p>
        <p><strong>Samples:</strong> {provider.samples || 0}</p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Tests</h3>
        <p style={{ color: '#6b7280' }}>No tests for this provider yet.</p>
      </div>
    </div>
  )
}


function Tests({ tests, clinics, providers, onSelectClinic, onSelectProvider, selectedReps = [], reps = [] }) {
  const [page, setPage] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const baseTests = selectedReps?.length > 0 ? (tests || []).filter(t => clinics.some(c => c.id === t.clinic_id && selectedReps.includes(c.rep_id))) : (tests || [])
  const filtered = [...baseTests].sort((a, b) => new Date(b.collected_date || b.collected || 0) - new Date(a.collected_date || a.collected || 0)).filter(t => {
    if (!startDate && !endDate) return true
    const d = new Date(t.collected_date || t.collected || t.finalized_date || t.finalized || 0)
    if (startDate && d < new Date(startDate)) return false
    if (endDate && d > new Date(endDate)) return false
    return true
  })
  const pageSize = 50
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize)
  return (
    <div>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <label>From</label>
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0) }} />
        <label>To</label>
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0) }} />
        <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); setPage(0) }}>Reset</button>
        <span style={{ color: '#6b7280' }}>{filtered.length} tests</span>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Accession</th><th>Clinic</th><th>Provider</th><th>Test</th><th>Status</th></tr></thead>
          <tbody>
            {pageData.map(t => {
              const clinic = clinics.find(c => c.id === t.clinic_id)
              const provider = providers.find(p => p.id === t.provider_id)
              return (
                <tr key={t.id}>
                  <td>{formatDate(t.collected_date || t.collected)}</td>
                  <td>{t.accession || '—'}</td>
                  <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => clinic && onSelectClinic(clinic)}>{clinic?.name || '—'}</td>
                  <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => provider && onSelectProvider(provider)}>{provider ? formatName(provider.name) : '—'}</td>
                  <td>{t.test_type || '—'}</td>
                  <td><span className="badge" style={{ background: t.finalized_date ? '#a7f3d0' : '#fef3c7', color: '#000' }}>{t.finalized_date ? 'Finalized' : 'Pending'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!pageData.length && <p style={{ color: '#6b7280', padding: 12 }}>No tests yet.</p>}
      </div>
      {filtered.length > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>←</button>
          <span style={{ padding: '4px 8px' }}>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= filtered.length}>→</button>
        </div>
      )}
    </div>
  )
}

function Providers({ providers, clinics, tests, onSelect, onSelectClinic, selectedReps = [], reps = [] }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('volume')
  const baseProviders = selectedReps?.length > 0 ? providers.filter(p => clinics.some(c => c.id === p.clinic_id && selectedReps.includes(c.rep_id))) : providers
  const filtered = [...baseProviders].filter(p => p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sortBy === 'az') return (a.name || '').localeCompare(b.name || '')
    const aCount = (tests || []).filter(t => t.provider_id === a.id).length
    const bCount = (tests || []).filter(t => t.provider_id === b.id).length
    return bCount - aCount
  })
  return (
    <div>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..." style={{ maxWidth: 280 }} />
        <select className="form-input" style={{ width: 160 }} onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
          <option value="volume">Sort: Volume</option>
          <option value="az">Sort: A-Z</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Rank</th><th>Provider</th><th>Clinic</th><th>Samples</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((p, i) => {
              const count = (tests || []).filter(t => t.provider_id === p.id).length
              const clinic = clinics.find(c => c.id === p.clinic_id)
              const isActive = count > 0
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }}>
                  <td>{i + 1}</td>
                  <td style={{ color: '#14b8a6' }} onClick={() => onSelect(p)}>{formatName(p.name)}</td>
                  <td style={{ color: '#14b8a6' }} onClick={() => clinic && onSelectClinic(clinic)}>{clinic?.name || '—'}</td>
                  <td>{count}</td>
                  <td><span className="badge" style={{ background: isActive ? '#a7f3d0' : '#fecaca', color: '#000' }}>{isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 12 }}>No providers found.</p>}
      </div>
    </div>
  )
}

function Expenses({ expenses, clinics, providers, onRefresh, role }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ business: '', amount: '', expense_date: '', exp_type: 'Meals', notes: '', city: '', clinic_id: '', isNew: false, people: '', selectedProviders: [], newClinic: { name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '', stage: 'Cold' }, providers: [{ name: '', title: 'MD', npi: '' }] })
  const canApprove = role === 'manager' || role === 'global_admin'
  const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  async function addExpense() {
    if (!form.amount) return
    let clinicId = form.clinic_id
    if (form.isNew && form.newClinic.name) {
      const { data: clinic } = await supabase.from('clinics').insert({ ...form.newClinic, is_prospect: true }).select().single()
      if (clinic) {
        clinicId = clinic.id
        for (const p of form.providers) {
          if (p.name.trim()) {
            await supabase.from('providers').insert({ ...p, clinic_id: clinic.id })
          }
        }
        if (confirm('Save as a new Prospect?')) {
          alert('Prospect saved!')
        }
      }
    }
    await supabase.from('expenses').insert({ business: form.business, amount: form.amount, expense_date: form.expense_date, exp_type: form.exp_type, notes: form.notes, city: form.city, clinic_id: clinicId || null, status: 'Ready' })
    setForm({ business: '', amount: '', expense_date: '', exp_type: 'Meals', notes: '', city: '', clinic_id: '', isNew: false, newClinic: { name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '', stage: 'Cold' }, providers: [{ name: '', title: 'MD', npi: '' }] })
    setShowAdd(false)
    onRefresh()
  }

  async function updateStatus(id, status) {
    await supabase.from('expenses').update({ status }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ New Expense</button>
        <button className="btn">Submit Selected</button>
        <button className="btn secondary">Past Expenses</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>My Expenses</h3>
        <span style={{ fontWeight: 600 }}>Month Total: ${total.toLocaleString()}</span>
      </div>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>New Expense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input value={form.business} onChange={e => setForm({...form, business: e.target.value})} placeholder="Business name" />
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" />
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Amount *" />
            <input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} />
            <select value={form.exp_type} onChange={e => setForm({...form, exp_type: e.target.value})}>
              <option>Meals</option><option>REP EXP</option><option>Travel</option><option>Lodging</option><option>Auto expense</option><option>Office supplies</option><option>Marketing</option><option>Other</option>
            </select>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Account</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <select value={form.isNew ? 'new' : form.clinic_id} onChange={e => setForm({...form, isNew: e.target.value === 'new', clinic_id: e.target.value === 'new' ? '' : e.target.value})} style={{ flex: 1 }}>
                  <option value="">Select existing (optional)</option>
                  <option value="new">+ New Clinic</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {form.isNew && (
              <div style={{ gridColumn: 'span 2', padding: 12, background: '#0f172a', borderRadius: 8, marginTop: 8 }}>
                <h4 style={{ marginBottom: 8 }}>New Clinic</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input value={form.newClinic.name} onChange={e => setForm({...form, newClinic: {...form.newClinic, name: e.target.value}})} placeholder="Clinic name *" />
                  <select value={form.newClinic.type} onChange={e => setForm({...form, newClinic: {...form.newClinic, type: e.target.value}})}>
                    <option>Orthopedic</option><option>Hospital</option><option>Wound Care</option><option>Podiatry</option><option>SNF</option><option>Urology</option>
                  </select>
                  <input value={form.newClinic.address} onChange={e => setForm({...form, newClinic: {...form.newClinic, address: e.target.value}})} placeholder="Address" style={{ gridColumn: 'span 2' }} />
                  <input value={form.newClinic.city} onChange={e => setForm({...form, newClinic: {...form.newClinic, city: e.target.value}})} placeholder="City" />
                  <input value={form.newClinic.state} onChange={e => setForm({...form, newClinic: {...form.newClinic, state: e.target.value}})} placeholder="State" />
                  <input value={form.newClinic.phone} onChange={e => setForm({...form, newClinic: {...form.newClinic, phone: e.target.value}})} placeholder="Phone" />
                  <input value={form.newClinic.email} onChange={e => setForm({...form, newClinic: {...form.newClinic, email: e.target.value}})} placeholder="Email" />
                </div>
                <h4 style={{ marginTop: 12, marginBottom: 8 }}>Providers</h4>
                {form.providers.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={formatName(p.name)} onChange={e => { const np = [...form.providers]; np[i].name = e.target.value; setForm({...form, providers: np}) }} placeholder="Name" style={{ flex: 2 }} />
                    <select value={p.title} onChange={e => { const np = [...form.providers]; np[i].title = e.target.value; setForm({...form, providers: np}) }} style={{ flex: 1 }}>
                      <option>MD</option><option>DO</option><option>NP</option><option>PA</option><option>DPM</option>
                    </select>
                    <input value={p.npi} onChange={e => { const np = [...form.providers]; np[i].npi = e.target.value; setForm({...form, providers: np}) }} placeholder="NPI" style={{ flex: 1 }} />
                  </div>
                ))}
                <button className="btn secondary" style={{ fontSize: 12 }} onClick={() => setForm({...form, providers: [...form.providers, { name: '', title: 'MD', npi: '' }]})}>+ Add Provider</button>
              </div>
            )}
          </div>
          {form.clinic_id && !form.isNew && (
              <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                <label style={{ fontSize: 13, color: '#9ca3af' }}>Providers</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {providers.filter(p => p.clinic_id === form.clinic_id).map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <input type="checkbox" checked={form.selectedProviders.includes(p.id)} onChange={e => {
                        const sel = e.target.checked ? [...form.selectedProviders, p.id] : form.selectedProviders.filter(id => id !== p.id)
                        setForm({...form, selectedProviders: sel})
                      }} />
                      {formatName(p.name)}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>How many people?</label>
              <input type="number" value={form.people} onChange={e => setForm({...form, people: e.target.value})} placeholder="Number of people" style={{ width: 150, marginTop: 4 }} />
            </div>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" style={{ width: '100%', marginBottom: 10, minHeight: 60, gridColumn: 'span 2' }} />
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#9ca3af' }}>Receipt (optional)</label><br/>
            <input type="file" accept="image/*" style={{ marginTop: 4 }} onChange={async (e) => {
              const file = e.target.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = async () => {
                const base64 = reader.result.split(',')[1]
                try {
                  const res = await fetch('https://vision.googleapis.com/v1/images:annotate?key=AIzaSyB626q0FdMwql3EoMgMFamfJ_ZMv75ylhc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      requests: [{
                        image: { content: base64 },
                        features: [{ type: 'TEXT_DETECTION' }]
                      }]
                    })
                  })
                  const data = await res.json()
                  const text = data.responses?.[0]?.textAnnotations?.[0]?.description || ''
                  console.log('OCR text:', text)
                  // Extract amounts - look for total, amount, $
                  const amounts = text.match(/\$?\s*([0-9]+[,.]?[0-9]*\.[0-9]{2})/g) || []
                  const largestAmount = amounts.map(a => parseFloat(a.replace(/[\$,]/g, ''))).filter(n => !isNaN(n)).sort((a,b) => b-a)[0]
                  if (largestAmount) setForm(f => ({ ...f, amount: largestAmount.toFixed(2) }))
                  // Extract date
                  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)
                  if (dateMatch) {
                    const parts = dateMatch[1].split(/[\/\-]/)
                    if (parts.length === 3) {
                      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
                      const dateStr = year + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0')
                      setForm(f => ({ ...f, expense_date: dateStr }))
                    }
                  }
                  // Try to get business name (first line often)
                  const lines = text.split('\n').filter(l => l.trim())
                  if (lines[0]) setForm(f => ({ ...f, business: lines[0].substring(0, 50) }))
                  alert('Receipt scanned! Amount: ' + (largestAmount || 'not found') + ', Date: ' + (dateMatch ? dateMatch[1] : 'not found'))
                } catch (err) {
                  console.log('OCR error:', err)
                  alert('Could not scan receipt.')
                }
              }
              reader.readAsDataURL(file)
            }} />
          </div>
          <button className="btn" onClick={addExpense}>Save Expense</button>
          <button className="btn secondary" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th></th><th>Date</th><th>Business</th><th>Type</th><th>Amount</th><th>Account</th><th>Status</th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td>{e.expense_date || '—'}</td>
                <td>{e.business || '—'}{e.city && <><br/><span style={{ fontSize: 12, color: '#6b7280' }}>{e.city}</span></>}</td>
                <td>{e.exp_type}</td>
                <td style={{ fontWeight: 600 }}>${parseFloat(e.amount || 0).toLocaleString()}</td>
                <td><span className={`badge badge-${e.status?.toLowerCase()}`}>{e.status}</span></td>
                <td>
                  {e.status === 'Ready' && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => updateStatus(e.id, 'Submitted')}>Submit</button>}
                  {e.status === 'Submitted' && canApprove && (
                    <>
                      <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => updateStatus(e.id, 'Approved')}>Approve</button>
                      <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => updateStatus(e.id, 'Denied')}>Deny</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!expenses.length && <p style={{ color: '#6b7280', padding: 12 }}>No expenses yet.</p>}
      </div>
    </div>
  )
}

function Reports({ clinics, tests, providers, onSelectClinic, onSelectProvider, selectedReps = [], reps = [] }) {
  const [activeAccountsPage, setActiveAccountsPage] = useState(0)
  const [activeProvidersPage, setActiveProvidersPage] = useState(0)
  const [inactiveAccountsPage, setInactiveAccountsPage] = useState(0)
  const [inactiveProvidersPage, setInactiveProvidersPage] = useState(0)
  const filteredClinics = selectedReps?.length > 0 ? clinics.filter(c => selectedReps.includes(c.rep_id)) : clinics
  const filteredTests = selectedReps?.length > 0 ? tests.filter(t => filteredClinics.some(c => c.id === t.clinic_id)) : tests
  const filteredProviders = selectedReps?.length > 0 ? providers.filter(p => filteredClinics.some(c => c.id === p.clinic_id)) : providers
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct']
  const monthCounts = months.map(m => {
    const monthNum = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m) + 1
    return (filteredTests || []).filter(t => {
      const d = new Date(t.collected_date || t.collected || 0)
      return d.getMonth() + 1 === monthNum
    }).length
  })
  const maxCount = Math.max(...monthCounts, 1)

  const activeAccounts = filteredClinics.filter(c => (filteredTests || []).some(t => t.clinic_id === c.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo)).sort((a, b) => {
    const aCount = (tests || []).filter(t => t.clinic_id === a.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo).length
    const bCount = (tests || []).filter(t => t.clinic_id === b.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo).length
    return bCount - aCount
  })
  const activeProviders = filteredProviders.filter(p => (filteredTests || []).some(t => t.provider_id === p.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo)).sort((a, b) => {
    const aCount = (tests || []).filter(t => t.provider_id === a.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo).length
    const bCount = (tests || []).filter(t => t.provider_id === b.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo).length
    return bCount - aCount
  })
  const inactiveAccounts = filteredClinics.filter(c => !(filteredTests || []).some(t => t.clinic_id === c.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo)).sort((a, b) => {
    const aCount = (tests || []).filter(t => t.clinic_id === a.id).length
    const bCount = (tests || []).filter(t => t.clinic_id === b.id).length
    return bCount - aCount
  })
  const inactiveProviders = filteredProviders.filter(p => !(filteredTests || []).some(t => t.provider_id === p.id && new Date(t.collected_date || t.collected || 0) > thirtyDaysAgo)).sort((a, b) => {
    const aCount = (tests || []).filter(t => t.provider_id === a.id).length
    const bCount = (tests || []).filter(t => t.provider_id === b.id).length
    return bCount - aCount
  })

  return (
    <div>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Total Sample Volume — Last 6 Months</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 8 }}>
          {months.map((m, i) => (
            <div key={m} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>{monthCounts[i]}</div>
              <div style={{ height: `${(monthCounts[i] / maxCount) * 100}px`, background: 'linear-gradient(to top, #0d9488, #14b8a6)', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{m}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Active Accounts</h3>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>At least one provider sent in last 30 days</p>
          {activeAccounts.slice(activeAccountsPage * 10, (activeAccountsPage + 1) * 10).map(c => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectClinic(c)}>{c.name}</div>
          ))}
          {activeAccounts.length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveAccountsPage(Math.max(0, activeAccountsPage - 1))} disabled={activeAccountsPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{activeAccountsPage * 10 + 1}-{Math.min((activeAccountsPage + 1) * 10, activeAccounts.length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveAccountsPage(activeAccountsPage + 1)} disabled={(activeAccountsPage + 1) * 10 >= activeAccounts.length}>→</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Active Providers</h3>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>Sent in last 30 days</p>
          {activeProviders.slice(activeProvidersPage * 10, (activeProvidersPage + 1) * 10).map(p => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectProvider(p)}>{formatName(p.name)}</div>
          ))}
          {activeProviders.length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveProvidersPage(Math.max(0, activeProvidersPage - 1))} disabled={activeProvidersPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{activeProvidersPage * 10 + 1}-{Math.min((activeProvidersPage + 1) * 10, activeProviders.length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveProvidersPage(activeProvidersPage + 1)} disabled={(activeProvidersPage + 1) * 10 >= activeProviders.length}>→</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Accounts Gone Inactive</h3>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>No tests in last 30 days</p>
          {inactiveAccounts.slice(inactiveAccountsPage * 10, (inactiveAccountsPage + 1) * 10).map(c => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectClinic(c)}>{c.name}</div>
          ))}
          {inactiveAccounts.length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setInactiveAccountsPage(Math.max(0, inactiveAccountsPage - 1))} disabled={inactiveAccountsPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{inactiveAccountsPage * 10 + 1}-{Math.min((inactiveAccountsPage + 1) * 10, inactiveAccounts.length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setInactiveAccountsPage(inactiveAccountsPage + 1)} disabled={(inactiveAccountsPage + 1) * 10 >= inactiveAccounts.length}>→</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Providers Gone Inactive</h3>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>No tests in last 30 days</p>
          {inactiveProviders.slice(inactiveProvidersPage * 10, (inactiveProvidersPage + 1) * 10).map(p => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', color: '#14b8a6', cursor: 'pointer' }} onClick={() => onSelectProvider(p)}>{formatName(p.name)}</div>
          ))}
          {inactiveProviders.length > 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setInactiveProvidersPage(Math.max(0, inactiveProvidersPage - 1))} disabled={inactiveProvidersPage === 0}>←</button>
              <span style={{ padding: '4px 8px' }}>{inactiveProvidersPage * 10 + 1}-{Math.min((inactiveProvidersPage + 1) * 10, inactiveProviders.length)}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setInactiveProvidersPage(inactiveProvidersPage + 1)} disabled={(inactiveProvidersPage + 1) * 10 >= inactiveProviders.length}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Training({ role }) {
  const [docs, setDocs] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Important Docs')
  const [file, setFile] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const canUpload = role === 'global_admin'
  useEffect(() => {
    supabase.from('training_docs').select('*').order('created_at', { ascending: false }).then(({ data }) => setDocs(data || []))
  }, [])
  async function addDoc() {
    if (!name.trim() || !file) return alert('Name and file required')
    const path = 'training/' + Date.now() + '-' + file.name
    const { error: upErr } = await supabase.storage.from('docs').upload(path, file)
    if (upErr) return alert(upErr.message)
    const { error } = await supabase.from('training_docs').insert({ name, category, path })
    if (error) return alert(error.message)
    setName('')
    setFile(null)
    supabase.from('training_docs').select('*').order('created_at', { ascending: false }).then(({ data }) => setDocs(data || []))
  }
  async function deleteDoc(doc) {
    await supabase.storage.from('docs').remove([doc.path])
    await supabase.from('training_docs').delete().eq('id', doc.id)
    setConfirmDel(null)
    supabase.from('training_docs').select('*').order('created_at', { ascending: false }).then(({ data }) => setDocs(data || []))
  }
  async function openDoc(doc) {
    const { data } = await supabase.storage.from('docs').createSignedUrl(doc.path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }
  const categories = ['Important Docs', 'Requisitions', 'Training Materials']

  return (
    <div>
      {canUpload && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Document name" style={{ flex: 1 }} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
            <button className="btn" onClick={addDoc}>Upload</button>
          </div>
        </div>
      )}
      {categories.map(cat => (
        <div key={cat} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 8, fontSize: 13, color: '#9ca3af', textTransform: 'uppercase' }}>{cat}</h3>
          {docs.filter(d => d.category === cat).map(d => (
            <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => openDoc(d)}>{d.name}</span>
              {canUpload && <button className="btn secondary btn-sm" onClick={() => setConfirmDel(d)}>Delete</button>}
            </div>
          ))}
          {!docs.filter(d => d.category === cat).length && <p style={{ color: '#6b7280', fontSize: 13 }}>No documents</p>}
        </div>
      ))}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDel(null)}>
          <div className="card" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Are you sure?</h3>
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>Delete "{confirmDel.name}"?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn secondary" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn" style={{ background: '#ef4444' }} onClick={() => deleteDoc(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



function Notifications({ items }) {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Notifications</h3>
      {items.length === 0 && <p style={{ color: '#6b7280' }}>No notifications.</p>}
      {items.map((n, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
          <div>{n.text}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{n.time}</div>
        </div>
      ))}
    </div>
  )
}

function Followups({ clinics }) {
  const [followups, setFollowups] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [viewingDay, setViewingDay] = useState(null)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [form, setForm] = useState({ clinic_id: '', date: '', type: 'Call', notes: '' })

  useEffect(() => {
    supabase.from('followups').select('*, clinics(name)').order('date').then(({ data }) => {
      setFollowups(data || [])
    })
  }, [])

  function addFollowup() {
    if (!form.date) return
    const clinic = clinics.find(c => c.id === form.clinic_id)
    setFollowups([...followups, { ...form, id: Date.now(), clinicName: clinic?.name || 'General' }])
    setForm({ clinic_id: '', date: '', type: 'Call', notes: '' })
    setShowAdd(false)
  }

  const today = new Date()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
  let days = []
  if (viewMode === 'week') {
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d.getDate())
    }
  } else {
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
  }

  const upcoming = [...followups].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button className="btn secondary" style={{ padding: '4px 8px' }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>←</button>
          <h3 style={{ margin: 0 }}>{viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button className="btn secondary" style={{ padding: '4px 8px' }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>→</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <button className={viewMode === 'month' ? 'btn' : 'btn secondary'} style={{ padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => setViewMode('month')}>Month</button>
          <button className={viewMode === 'week' ? 'btn' : 'btn secondary'} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setViewMode('week')}>Week</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 12 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ color: '#6b7280', padding: 4 }}>{d}</div>)}
          {days.map((d, i) => {
            const dayFollowups = d ? followups.filter(f => new Date(f.date).getDate() === d) : []
            return (
              <div key={i} onClick={() => d && setViewingDay(d)} style={{ padding: 8, borderRadius: 4, cursor: d ? 'pointer' : 'default', background: dayFollowups.length ? '#1e3a3a' : 'transparent', position: 'relative' }}>
                {d || ''}
                {dayFollowups.length > 0 && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, color: '#14b8a6' }}>{dayFollowups.length}</span>}
              </div>
            )
          })}
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Upcoming</h3>
        {upcoming.map(f => (
          <div key={f.id} onClick={() => setViewingDay(new Date(f.date).getDate())} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <strong>{f.clinics?.name || 'General'}</strong> · {f.type}
              {f.notes && <div style={{ color: '#6b7280', fontSize: 13 }}>{f.notes}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#14b8a6' }}>{f.date}</span>
              <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => alert('Edit: ' + f.id)}>Edit</button>
              <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11, background: '#ef4444' }} onClick={async () => {
                await supabase.from('followups').delete().eq('id', f.id)
                setFollowups(followups.filter(x => x.id !== f.id))
              }}>Delete</button>
            </div>
          </div>
        ))}
        {!upcoming.length && <p style={{ color: '#6b7280' }}>No follow-ups scheduled.</p>}
      </div>
      {viewingDay && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setViewingDay(null)}>
          <div className="card" style={{ width: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>November {viewingDay}</h3>
            {followups.filter(f => new Date(f.date).getDate() === viewingDay).map(f => (
              <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{f.clinics?.name || 'General'}</div>
                    <div style={{ color: '#14b8a6', fontSize: 13 }}>{f.type} · {f.time}</div>
                    <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>{f.notes}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn secondary" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => alert('Edit: ' + f.id)}>Edit</button>
                    <button className="btn secondary" style={{ padding: '2px 6px', fontSize: 10, background: '#ef4444' }} onClick={async () => {
                      await supabase.from('followups').delete().eq('id', f.id)
                      setFollowups(followups.filter(x => x.id !== f.id))
                      setViewingDay(null)
                    }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {!followups.filter(f => new Date(f.date).getDate() === viewingDay).length && <p style={{ color: '#6b7280' }}>No follow-ups this day.</p>}
            <button className="btn secondary" onClick={() => setViewingDay(null)} style={{ marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

function RepsList({ selected, setSelected, clinics = [], tests = [] }) {
  const [reps, setReps] = useState([])
  const [managers, setManagers] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' })
  const [filtered, setFiltered] = useState(false)
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
  }, [])
  const [editing, setEditing] = useState(null)
  async function createRep() {
    if (!form.first.trim() || !form.last.trim() || !form.email.trim()) return alert('First name, last name, and email are required')
    const full_name = form.first.trim() + ' ' + form.last.trim()
    const payload = { full_name, phone: form.phone, email: form.email, home_address: form.address, manager_id: form.manager_id || null, role: 'rep' }
    let error
    if (editing) {
      ({ error } = await supabase.from('profiles').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('profiles').insert(payload))
    }
    if (error) return alert(error.message)
    setForm({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' })
    setEditing(null)
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }
  function startEdit(r) {
    const parts = (r.full_name || '').split(' ')
    setForm({ first: parts[0] || '', last: parts.slice(1).join(' ') || '', phone: r.phone || '', email: r.email || '', address: r.home_address || '', manager_id: r.manager_id || '' })
    setEditing(r.id)
    setTimeout(() => document.getElementById('rep-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  function toggle(id) {
    setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  function selectAll() {
    setSelected(selected.length === reps.length ? [] : reps.map(r => r.id))
  }
  function applyFilter() {
    setFiltered(true)
  }
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Reps</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Toggle which reps' data is visible</p>
      </div>
      <div className="card">
        <table>
          <thead><tr><th></th><th>Rep</th><th>Manager</th><th>Accounts</th><th>Tests</th><th></th></tr></thead>
          <tbody>
            {reps.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <td style={{ color: '#14b8a6' }}>{r.full_name || '—'}</td>
                <td>{managers.find(m => m.id === r.manager_id)?.full_name || '—'}</td>
                <td>{clinics.filter(c => c.rep_id === r.id).length}</td>
                <td>{tests.filter(t => clinics.some(c => c.id === t.clinic_id && c.rep_id === r.id)).length}</td>
                <td><button className="btn secondary btn-sm" onClick={() => startEdit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reps.length && <p style={{ color: '#6b7280' }}>No reps yet.</p>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button className="btn secondary" onClick={selectAll}>Select All</button>
        <button className="btn" onClick={applyFilter}>Filter</button>
      </div>
      <div className="card" id="rep-form" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{editing ? "Edit Rep" : "Create New Rep"}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>First Name</label><input value={form.first} onChange={e => setForm({...form, first: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Last Name</label><input value={form.last} onChange={e => setForm({...form, last: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%' }} /></div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Manager</label>
          <select value={form.manager_id} onChange={e => setForm({...form, manager_id: e.target.value})} style={{ width: '100%' }}>
            <option value="">Select manager...</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}><button className="btn" onClick={createRep}>{editing ? "Update Rep" : "Create Rep"}</button>
          {editing && <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ first: '', last: '', phone: '', email: '', address: '', manager_id: '' }) }}>Cancel</button>}</div>
      </div>
    </div>
  )
}


function ManagersList() {
  const [managers, setManagers] = useState([])
  const [reps, setReps] = useState([])
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '' })
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(null)
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }, [])
  async function createManager() {
    if (!form.first.trim() || !form.last.trim() || !form.email.trim()) return alert('First name, last name, and email are required')
    const full_name = form.first.trim() + ' ' + form.last.trim()
    const payload = { full_name, phone: form.phone, email: form.email, role: 'manager' }
    let error
    if (editing) {
      ({ error } = await supabase.from('profiles').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('profiles').insert(payload))
    }
    if (error) return alert(error.message)
    setForm({ first: '', last: '', phone: '', email: '' })
    setEditing(null)
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
  }
  function startEdit(m) {
    const parts = (m.full_name || '').split(' ')
    setForm({ first: parts[0] || '', last: parts.slice(1).join(' ') || '', phone: m.phone || '', email: m.email || '' })
    setEditing(m.id)
    setTimeout(() => document.getElementById('mgr-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  async function assignRep(repId, managerId) {
    await supabase.from('profiles').update({ manager_id: managerId }).eq('id', repId)
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }
  const [pickRep, setPickRep] = useState('')
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Managers</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Manage managers and assign reps</p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Current Managers</h3>
        {managers.map(m => {
          const assigned = reps.filter(r => r.manager_id === m.id)
          return (
            <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
              <div style={{ color: '#14b8a6', fontWeight: 600 }}>{m.full_name || '—'}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Reps: {assigned.length ? assigned.map(r => r.full_name).join(', ') : 'None'}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={pickRep} onChange={e => setPickRep(e.target.value)} style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' }}>
                  <option value="">Assign a rep...</option>
                  {reps.filter(r => r.manager_id !== m.id).map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
                <button className="btn secondary" onClick={() => { if (pickRep) { assignRep(pickRep, m.id); setPickRep('') } }}>Assign</button>
                <button className="btn secondary btn-sm" onClick={() => startEdit(m)}>Edit</button>
              </div>
            </div>
          )
        })}
        {!managers.length && <p style={{ color: '#6b7280' }}>No managers yet.</p>}
      </div>
      <div className="card" id="mgr-form" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{editing ? "Edit Manager" : "Add New Manager"}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>First Name</label><input value={form.first} onChange={e => setForm({...form, first: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Last Name</label><input value={form.last} onChange={e => setForm({...form, last: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" onClick={createManager}>{editing ? "Update Manager" : "Add Manager"}</button>
          {editing && <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ first: '', last: '', phone: '', email: '' }) }}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}

function Users() {
  const [users, setUsers] = useState([])
  useEffect(() => { supabase.from('profiles').select('*').then(({ data }) => setUsers(data || [])) }, [])
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>All Users</h3>
      <table>
        <thead><tr><th>Name</th><th>Role</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.full_name || '—'}</td>
              <td><span className="badge" style={{ background: u.role === 'global_admin' ? '#0d9488' : u.role === 'manager' ? '#3b82f6' : '#6b7280' }}>{u.role}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
