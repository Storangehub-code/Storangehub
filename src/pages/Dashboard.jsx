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
  if (!session?.user) return <div style={{ padding: 40 }}>Loading...</div>

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
    const { data: repsData } = await supabase.from('profiles').select('*').eq('role', 'rep')
    setReps(repsData || [])
    if (profile?.role === 'rep') setSelectedReps([session.user.id])
  }

  async function logActivity(action, details) {
    if (!session?.user) return
    await supabase.from('activity_log').insert({
      user_id: session.user.id,
      user_email: session.user.email,
      action,
      details
    })
  }

  const role = profile?.role || 'rep'
  const isMaster = session.user.email === 'spud.w.mann@gmail.com'
  const roleLabel = isMaster ? 'Master' : ({ global_admin: 'Global Admin', manager: 'Manager', rep: 'Rep' }[role] || 'Rep')

  const allNav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'prospects', label: 'Prospects' },
    ...(role === 'global_admin' ? [{ id: 'approve', label: 'Approve Accounts' }] : []),
    { id: 'providers', label: 'Providers' },
    ...(role === 'manager' || role === 'global_admin' ? [{ id: 'reps', label: 'Reps' }] : []),
    ...(role === 'global_admin' ? [{ id: 'managers', label: 'Managers' }] : []),
    { id: 'tests', label: 'Tests' },
    { id: 'expenses', label: 'Expenses', disabled: true },
    { id: 'reports', label: 'Reports' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'training', label: 'Training' },
    { id: 'users', label: 'Users', adminOnly: true },
    ...(isMaster ? [{ id: 'master', label: 'Master Log' }] : [])
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
          <div key={n.id} onClick={() => { if (!n.disabled) { setPage(n.id); setSelectedClinic(null); setSelectedProvider(null); logActivity('page_view', n.label) } }} 
            style={{ padding: '10px 16px', cursor: n.disabled ? 'not-allowed' : 'pointer', borderRadius: 8, marginBottom: 4, background: page === n.id && !selectedClinic ? '#0d9488' : 'transparent', fontSize: 14, color: n.disabled ? '#4b5563' : 'inherit' }}>
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
        
        {page === 'dashboard' && <DashboardHome clinics={clinics} expenses={expenses} providers={providers} tests={tests} selectedReps={selectedReps} reps={reps} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} setPage={setPage} />}
        {page === 'approve' && role === 'global_admin' && <ApproveAccounts clinics={clinics} onRefresh={loadData} />}
        {page === 'prospects' && !selectedClinic && <Prospects clinics={clinics} onRefresh={loadData} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} userId={session.user.id} />}
        {page === 'prospects' && selectedClinic && <ClinicDetail clinic={selectedClinic} providers={providers.filter(p => p.clinic_id === selectedClinic.id)} tests={tests.filter(t => t.clinic_id === selectedClinic.id)} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} isProspect={true} role={role} />}
        {page === 'accounts' && !selectedClinic && <Accounts clinics={clinics} tests={tests} onRefresh={loadData} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} role={role} setPage={setPage} />}
        {page === 'accounts' && selectedClinic && !selectedProvider && (
          <ClinicDetail clinic={selectedClinic} providers={providers.filter(p => p.clinic_id === selectedClinic.id)} tests={tests.filter(t => t.clinic_id === selectedClinic.id)} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} role={role} />
        )}
        {selectedProvider && <ProviderDetail provider={selectedProvider} onBack={() => setSelectedProvider(null)} />}
        {page === 'tests' && <Tests tests={tests} clinics={clinics} providers={providers} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} selectedReps={selectedReps} reps={reps} role={role} />}
        {page === 'providers' && !selectedProvider && <Providers providers={providers} clinics={clinics} tests={tests} onSelect={setSelectedProvider} onSelectClinic={setSelectedClinic} selectedReps={selectedReps} reps={reps} />}
        {page === 'reps' && <RepsList selected={selectedReps} setSelected={setSelectedReps} clinics={clinics} tests={tests} role={role} />}
          {page === 'managers' && <ManagersList />}
        {page === 'expenses' && <Expenses expenses={expenses} clinics={clinics} providers={providers} onRefresh={loadData} role={role} />}
        {page === 'reports' && <Reports clinics={clinics} tests={tests} providers={providers} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} selectedReps={selectedReps} reps={reps} />}
        {page === 'notifications' && <Notifications items={notifications} />}
        {page === 'followups' && <Followups clinics={clinics} />}
        {page === 'training' && <Training role={role} />}
        {page === 'master' && isMaster && <MasterLog session={session} />}
        {page === 'users' && role === 'global_admin' && <Users />}
      </div>
    </div>
  )
}

function DashboardHome({ clinics, expenses, providers, tests, selectedReps, reps, onSelectClinic, onSelectProvider, setPage }) {
  const filteredClinics = selectedReps?.length > 0 ? clinics.filter(c => selectedReps.includes(c.rep_id)) : clinics
  const filteredProviders = selectedReps?.length > 0 ? providers.filter(p => filteredClinics.some(c => c.id === p.clinic_id)) : providers
  const filteredTests = selectedReps?.length > 0 ? tests.filter(t => filteredClinics.some(c => c.id === t.clinic_id)) : tests
  const filtered = selectedReps?.length > 0
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [testPage, setTestPage] = useState(0)
  const [attentionPage, setAttentionPage] = useState(0)
  const earliestDate = '2026-02-01'
  const latestDate = new Date().toISOString().split('T')[0]
  const startDate = (dateRange.start || '2026-02-01').split('T')[0]
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
  const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov']
  const monthMap = { Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11' }
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
    return { ...p, count }
  })
  
  // Top accounts by test count
  const accountCounts = {}
  ;(filteredTests || []).forEach(t => {
    const c = clinics.find(cl => testBelongsToClinic(t, cl))
    if (c) accountCounts[c.id] = (accountCounts[c.id] || 0) + 1
  })
  const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => {
    const c = clinics.find(cl => cl.id === id)
    return { ...c, count }
  })

  return (
    <div>
      <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>Data through {new Date().toLocaleDateString()}</p>
      {selectedReps?.length > 0 && <div className="card" style={{ marginBottom: 16, background: '#0d9488' }}><p style={{ margin: 0 }}>Filtered to: {selectedReps.map(id => reps.find(r => r.id === id)?.full_name || 'Rep').join(', ')}</p></div>}
      <div style={{ marginBottom: 16, width: 'calc(40% - 8px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
          <span>{formatDate(startDate)}</span>
          <span>{formatDate(endDate)}</span>
        </div>
        <div style={{ position: 'relative', height: 20 }}>
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 4, background: '#374151', borderRadius: 2 }}></div>
          <div style={{ position: 'absolute', top: 8, left: `${((new Date(startDate) - new Date(earliestDate || '2020-01-01')) / (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))) * 100}%`, width: `${Math.max(0, ((new Date(endDate) - new Date(startDate)) / (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))) * 100)}%`, height: 4, background: '#14b8a6', borderRadius: 2 }}></div>
          <div onMouseDown={(e) => { const track = e.currentTarget.parentElement; const rect = track.getBoundingClientRect(); const move = (ev) => { const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)); const d = new Date(new Date(earliestDate || '2020-01-01').getTime() + x * (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))).toISOString().split('T')[0]; if (d <= endDate) setDateRange({ ...dateRange, start: d }); }; move(e); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} style={{ position: 'absolute', top: 0, left: `${((new Date(startDate) - new Date(earliestDate || '2020-01-01')) / (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))) * 100}%`, width: 16, height: 16, background: '#fff', border: '2px solid #14b8a6', borderRadius: '50%', cursor: 'pointer', transform: 'translateX(-50%)', zIndex: 2 }}></div>
          <div onMouseDown={(e) => { const track = e.currentTarget.parentElement; const rect = track.getBoundingClientRect(); const move = (ev) => { const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)); const d = new Date(new Date(earliestDate || '2020-01-01').getTime() + x * (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))).toISOString().split('T')[0]; if (d >= startDate) setDateRange({ ...dateRange, end: d }); }; move(e); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} style={{ position: 'absolute', top: 0, left: `${((new Date(endDate) - new Date(earliestDate || '2020-01-01')) / (new Date(latestDate) - new Date(earliestDate || '2020-01-01'))) * 100}%`, width: 16, height: 16, background: '#fff', border: '2px solid #14b8a6', borderRadius: '50%', cursor: 'pointer', transform: 'translateX(-50%)', zIndex: 2 }}></div>
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-value">{totalTests}</div><div className="kpi-label">Tests</div><div className="kpi-change up">↑ Active tracking</div></div>
        <div className="kpi"><div className="kpi-value">{activeAccounts}</div><div className="kpi-label">Active Accounts</div><div className="kpi-change up">{clinics.length} total</div></div>
        <div className="kpi"><div className="kpi-value">{providers.length}</div><div className="kpi-label">Providers</div></div>
        <div className="kpi"><div className="kpi-value" style={{ color: needAttention > 0 ? '#ef4444' : '#10b981' }}>{needAttention}</div><div className="kpi-label">Need Attention</div><div className="kpi-change down">No recent tests</div></div>
      </div>
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
                const end = `${year}-${mm}-${String(lastDay).padStart(2,'0')}`
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
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: `conic-gradient(${topTests.map(([t, c], i) => { const total = topTests.reduce((s, [,v]) => s + v, 0); const start = topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) / total * 360; const end = (topTests.slice(0, i).reduce((s, [,v]) => s + v, 0) + c) / total * 360; const colors = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']; return `${colors[i % colors.length]} ${start}deg ${end}deg`; }).join(', ')})` }}></div>
            <div>
              {topTests.map(([t, c]) => <div key={t} style={{ fontSize: 13, marginBottom: 4 }}>{t}: {c}</div>)}
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Providers</h3>
          {topProviders.map(p => p && <div key={p.id} style={{ fontSize: 13, marginBottom: 6, cursor: 'pointer', color: '#14b8a6' }} onClick={() => onSelectProvider(p)}>{formatName(p.name)} <span style={{ color: '#9ca3af' }}>({p.count})</span></div>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Accounts</h3>
          {topAccounts.map(c => c && <div key={c.id} style={{ fontSize: 13, marginBottom: 6, cursor: 'pointer', color: '#14b8a6' }} onClick={() => onSelectClinic(c)}>{c.name} <span style={{ color: '#9ca3af' }}>({c.count})</span></div>)}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Accounts Needing Attention</h3>
          {filteredClinics.filter(c => !dateFilteredTests.some(t => testBelongsToClinic(t, c))).slice(attentionPage * 5, (attentionPage + 1) * 5).map(c => (
            <div key={c.id} style={{ fontSize: 13, marginBottom: 6, cursor: 'pointer', color: '#ef4444' }} onClick={() => onSelectClinic(c)}>{c.name}</div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button className="btn secondary" onClick={() => setAttentionPage(Math.max(0, attentionPage - 1))} disabled={attentionPage === 0}>Prev</button>
            <button className="btn secondary" onClick={() => setAttentionPage(attentionPage + 1)} style={{ marginLeft: 8 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function ApproveAccounts({ clinics, onRefresh }) {
  const pending = clinics.filter(c => c.status === 'pending')
  async function approve(id) {
    await supabase.from('clinics').update({ status: 'active' }).eq('id', id)
    onRefresh()
  }
  return (
    <div>
      <h2>Approve Accounts</h2>
      {pending.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: 12 }}>
          <div>{c.name}</div>
          <button className="btn" onClick={() => approve(c.id)}>Approve</button>
        </div>
      ))}
      {!pending.length && <p>No pending accounts.</p>}
    </div>
  )
}

function Prospects({ clinics, onRefresh, onSelect, selectedReps, reps, userId }) {
  const prospects = clinics.filter(c => c.is_prospect)
  return (
    <div>
      <h2>Prospects</h2>
      {prospects.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => onSelect(c)}>
          {c.name}
        </div>
      ))}
    </div>
  )
}

function Accounts({ clinics, tests, onRefresh, onSelect, selectedReps, reps, role, setPage }) {
  const accounts = clinics.filter(c => !c.is_prospect)
  return (
    <div>
      <h2>Accounts</h2>
      {accounts.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => onSelect(c)}>
          {c.name}
        </div>
      ))}
    </div>
  )
}

function ClinicDetail({ clinic, providers, tests, onBack, onRefresh, onSelectProvider, isProspect, role }) {
  return (
    <div>
      <button className="btn secondary" onClick={onBack}>Back</button>
      <h2>{clinic.name}</h2>
      <p>{clinic.address}</p>
    </div>
  )
}

function ProviderDetail({ provider, onBack }) {
  return (
    <div>
      <button className="btn secondary" onClick={onBack}>Back</button>
      <h2>{formatName(provider.name)}</h2>
    </div>
  )
}

function Tests({ tests, clinics, providers, onSelectClinic, onSelectProvider, selectedReps, reps, role }) {
  return <div><h2>Tests</h2><p>{tests.length} tests</p></div>
}

function Providers({ providers, clinics, tests, onSelect, onSelectClinic, selectedReps, reps }) {
  return <div><h2>Providers</h2>{providers.map(p => <div key={p.id} onClick={() => onSelect(p)}>{formatName(p.name)}</div>)}</div>
}

function Expenses({ expenses, clinics, providers, onRefresh, role }) {
  return <div><h2>Expenses</h2><p>{expenses.length} expenses</p></div>
}

function Reports({ clinics, tests, providers, onSelectClinic, onSelectProvider, selectedReps, reps }) {
  return <div><h2>Reports</h2></div>
}

function Notifications({ items }) {
  return <div><h2>Notifications</h2>{items.map((n, i) => <div key={i}>{n}</div>)}</div>
}

function Followups({ clinics }) {
  return <div><h2>Follow-ups</h2></div>
}

function Training({ role }) {
  return <div><h2>Training</h2></div>
}

function RepsList({ selected, setSelected, clinics = [], tests = [], role }) {
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
    if (!editing) {
      try {
        await fetch('/.netlify/functions/sendemail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: form.email,
            subject: 'Welcome to Storangehub',
            text: `You've been given access to Storangehub.com.\n\nLogin: ${form.email}\nPassword: Welcome1\n\nPlease log in and change your password.`
          })
        })
      } catch (e) { console.log('Email error', e) }
    }
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
                <td>{role === 'global_admin' && <button className="btn secondary btn-sm" onClick={() => startEdit(r)}>Edit</button>}</td>
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
      {role === 'global_admin' && <div className="card" id="rep-form" style={{ marginTop: 16 }}>
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
      </div>}
    </div>
  )
}


function ManagersList() {
  const [managers, setManagers] = useState([])
  const [reps, setReps] = useState([])
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', address: '' })
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(null)
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'manager').then(({ data }) => setManagers(data || []))
    supabase.from('profiles').select('*').eq('role', 'rep').then(({ data }) => setReps(data || []))
  }, [])
  async function createManager() {
    if (!form.first.trim() || !form.last.trim() || !form.email.trim()) return alert('First name, last name, and email are required')
    const full_name = form.first.trim() + ' ' + form.last.trim()
    const payload = { full_name, phone: form.phone, email: form.email, home_address: form.address, role: 'manager' }
    let error
    if (editing) {
      ({ error } = await supabase.from('profiles').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('profiles').insert(payload))
    }
    if (error) return alert(error.message)
    if (!editing) {
      try {
        await fetch('/.netlify/functions/sendemail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: form.email,
            subject: 'Welcome to Storangehub',
            text: `You've been given access to Storangehub.com.\n\nLogin: ${form.email}\nPassword: Welcome1\n\nPlease log in and change your password.`
          })
        })
      } catch (e) { console.log('Email error', e) }
    }
    setForm({ first: '', last: '', phone: '', email: '', address: '' })
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
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%' }} /></div>
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
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', home_address: '' })
  const protectedIds = ['3fac6f60-da66-47cd-9770-d0830a9f6802', 'fdc1e445-e0bc-4ba8-b96e-bb21618faffe', '47ed75c5-e011-4471-9658-eb1ad63553eb']
  useEffect(() => { supabase.from('profiles').select('*').then(({ data }) => setUsers(data || [])) }, [])

  async function save() {
    if (!form.full_name.trim() || !editing) return
    await supabase.from('profiles').update({ full_name: form.full_name, email: form.email, home_address: form.home_address }).eq('id', editing)
    setEditing(null)
    setForm({ full_name: '', email: '', home_address: '' })
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data || []))
  }

  async function remove(id) {
    if (!confirm('Delete this user?')) return
    await supabase.from('profiles').delete().eq('id', id)
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data || []))
  }

  async function resetPassword(email) {
    if (!email) return alert('No email on file')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) alert('Error: ' + error.message)
    else alert('Password reset email sent to ' + email)
  }

  function startEdit(u) {
    setForm({ full_name: u.full_name || '', email: u.email || '', home_address: u.home_address || '' })
    setEditing(u.id)
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>All Users</h3>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name || '—'}</td>
                <td><span className="badge" style={{ background: u.role === 'global_admin' ? '#0d9488' : u.role === 'manager' ? '#3b82f6' : '#6b7280' }}>{u.role}</span></td>
                <td>{u.email || '—'}</td>
                <td>
                  {!protectedIds.includes(u.id) && (
                    <>
                      <button className="btn secondary btn-sm" onClick={() => startEdit(u)} style={{ marginRight: 4 }}>Edit</button>
                      <button className="btn secondary btn-sm" onClick={() => remove(u.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Edit User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Name</label><input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
            <div><label style={{ fontSize: 13, color: '#9ca3af' }}>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 13, color: '#9ca3af' }}>Home Address</label><input value={form.home_address} onChange={e => setForm({...form, home_address: e.target.value})} /></div>
          </div>
          <button className="btn" onClick={save}>Save</button>
          <button className="btn secondary" onClick={() => resetPassword(form.email)} style={{ marginLeft: 8 }}>Reset Password</button>
          <button className="btn secondary" onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

function MasterLog({ session }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
    const interval = setInterval(loadLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadLogs() {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100)
    setLogs(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Activity Log <span style={{ fontSize: 12, color: '#6b7280' }}>(refreshes every 10s)</span></h3>
        {loading && <p>Loading...</p>}
        {!loading && !logs.length && <p style={{ color: '#6b7280' }}>No activity yet. Actions will appear here.</p>}
        <table style={{ fontSize: 13 }}>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_email || '—'}</td>
                <td>{l.action}</td>
                <td style={{ color: '#9ca3af' }}>{l.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
