import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [clinics, setClinics] = useState([])
  const [providers, setProviders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [activities, setActivities] = useState([])
  const [followups, setFollowups] = useState([])
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState('dashboard')
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data || { role: 'rep', full_name: session.user.email })
  }

  async function loadData() {
    const [c, p, e] = await Promise.all([
      supabase.from('clinics').select('*').order('name'),
      supabase.from('providers').select('*, clinics(name)').order('name'),
      supabase.from('expenses').select('*').order('created_at', { ascending: false })
    ])
    setClinics(c.data || [])
    setProviders(p.data || [])
    setExpenses(e.data || [])
  }

  const role = profile?.role || 'rep'
  const roleLabel = { global_admin: 'Global Admin', manager: 'Manager', rep: 'Rep' }[role] || 'Rep'

  const allNav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'prospects', label: 'Prospects' },
    { id: 'providers', label: 'Providers' },
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
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Response DX</h2>
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
        
        {page === 'dashboard' && <DashboardHome clinics={clinics} expenses={expenses} providers={providers} />}
        {page === 'prospects' && <Prospects clinics={clinics} onRefresh={loadData} />}
        {page === 'accounts' && !selectedClinic && <Accounts clinics={clinics} onRefresh={loadData} onSelect={setSelectedClinic} />}
        {page === 'accounts' && selectedClinic && !selectedProvider && (
          <ClinicDetail clinic={selectedClinic} providers={providers.filter(p => p.clinic_id === selectedClinic.id)} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} />
        )}
        {selectedProvider && <ProviderDetail provider={selectedProvider} onBack={() => setSelectedProvider(null)} />}
        {page === 'providers' && !selectedProvider && <Providers providers={providers} onSelect={setSelectedProvider} />}
        {page === 'expenses' && <Expenses expenses={expenses} clinics={clinics} onRefresh={loadData} role={role} />}
        {page === 'reports' && <Reports clinics={clinics} expenses={expenses} providers={providers} />}
        {page === 'notifications' && <Notifications items={notifications} />}
        {page === 'followups' && <Followups clinics={clinics} />}
        {page === 'training' && <Training role={role} />}
        {page === 'users' && role === 'global_admin' && <Users />}
      </div>
    </div>
  )
}

function DashboardHome({ clinics, expenses, providers }) {
  const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const totalTests = clinics.reduce((s, c) => s + (c.total_tests || 0), 0)
  const activeAccounts = clinics.filter(c => (c.total_tests || 0) > 0).length
  return (
    <div>
      <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>Data through {new Date().toLocaleDateString()}</p>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-value">{totalTests.toLocaleString()}</div>
          <div className="kpi-label">Tests</div>
          <div className="kpi-change up">↑ Active tracking</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{clinics.length}</div>
          <div className="kpi-label">Accounts</div>
          <div className="kpi-change up">{activeAccounts} active</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{providers.length}</div>
          <div className="kpi-label">Providers</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">${(totalTests * 125).toLocaleString()}</div>
          <div className="kpi-label">Est. Revenue</div>
          <div className="kpi-change up">$125/test</div>
        </div>
        <div className="kpi">
          <div className="kpi-value" style={{ color: clinics.length - activeAccounts > 0 ? '#ef4444' : '#10b981' }}>{clinics.length - activeAccounts}</div>
          <div className="kpi-label">Need Attention</div>
          <div className="kpi-change down">No recent tests</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Monthly Volume</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 8 }}>
            {['Apr','May','Jun','Jul','Aug','Sep','Oct'].map((m, i) => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${30 + i * 12}px`, background: 'linear-gradient(to top, #0d9488, #14b8a6)', borderRadius: '4px 4px 0 0' }}></div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests by Panel</h3>
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#0d9488' }}>●</span> UTI</span><span>48%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#14b8a6' }}>●</span> Wound</span><span>32%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#5eead4' }}>●</span> SynoviFact</span><span>12%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{ color: '#99f6e4' }}>●</span> Other</span><span>8%</span></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Providers</h3>
          {providers.slice(0, 5).map(p => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span>{p.name}</span><span style={{ color: '#6b7280' }}>{p.samples || 0}</span>
            </div>
          ))}
          {!providers.length && <p style={{ color: '#6b7280' }}>No providers yet</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Accounts</h3>
          {clinics.slice(0, 5).map(c => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span>{c.name}</span><span style={{ color: '#6b7280', fontSize: 13 }}>{c.city || c.type}</span>
            </div>
          ))}
          {!clinics.length && <p style={{ color: '#6b7280' }}>No accounts yet</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Expense Status</h3>
          {['Ready', 'Submitted', 'Approved', 'Denied'].map(status => (
            <div key={status} style={{ padding: '8px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span>{status}</span>
              <span className={`badge badge-${status.toLowerCase()}`}>{expenses.filter(e => e.status === status).length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


function Prospects({ clinics, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', stage: 'Cold' })
  const prospects = clinics.filter(c => c.is_prospect)

  async function addProspect() {
    if (!form.name.trim()) return
    await supabase.from('clinics').insert({ ...form, is_prospect: true })
    setForm({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', stage: 'Cold' })
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

  return (
    <div>
      <button className="btn" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>+ Add Prospect</button>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>New Prospect</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Clinic name *" />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option>Orthopedic</option><option>Hospital</option><option>Wound Care</option><option>Podiatry</option><option>SNF</option><option>Urology</option>
            </select>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" />
            <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="State" />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" />
            <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
              <option>Cold</option><option>Warm</option><option>HOT</option>
            </select>
          </div>
          <button className="btn" onClick={addProspect}>Save Prospect</button>
          <button className="btn secondary" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Stage</th><th>Actions</th></tr></thead>
          <tbody>
            {prospects.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.type || '—'}</td>
                <td>{p.city || '—'}</td>
                <td>
                  <select value={p.stage || 'Cold'} onChange={e => updateStage(p.id, e.target.value)} style={{ background: stageColor[p.stage] || '#6b7280', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }}>
                    <option>Cold</option><option>Warm</option><option>HOT</option>
                  </select>
                </td>
                <td><button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => convertToAccount(p.id)}>Convert to Account</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!prospects.length && <p style={{ color: '#6b7280', padding: 12 }}>No prospects yet.</p>}
      </div>
    </div>
  )
}

function Accounts({ clinics, onRefresh, onSelect }) {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [routeMode, setRouteMode] = useState(false)
  const [routeAccounts, setRouteAccounts] = useState([])
  const [form, setForm] = useState({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '' })
  const filtered = clinics.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  async function addClinic() {
    if (!form.name.trim()) return
    await supabase.from('clinics').insert(form)
    setShowAdd(false)
    setForm({ name: '', type: 'Orthopedic', city: '', state: '', phone: '', email: '', address: '', fax: '', emr: '' })
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Add Account</button>
        <button className="btn secondary" onClick={() => setRouteMode(!routeMode)}>{routeMode ? 'Cancel Route' : 'Build Route'}</button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." style={{ flex: 1, maxWidth: 280 }} />
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
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Phone</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => routeMode ? setRouteAccounts(routeAccounts.includes(c.id) ? routeAccounts.filter(id => id !== c.id) : [...routeAccounts, c.id]) : onSelect(c)} style={{ cursor: 'pointer', background: routeAccounts.includes(c.id) ? '#1e3a3a' : 'transparent' }}>
                <td style={{ color: '#14b8a6' }}>{routeMode && (routeAccounts.includes(c.id) ? '✓ ' : '○ ')}{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td><span className="badge" style={{ background: (c.total_tests || 0) > 0 ? '#a7f3d0' : '#fecaca', color: '#000' }}>{(c.total_tests || 0) > 0 ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 12 }}>No accounts found.</p>}
      </div>
    </div>
  )
}

function ClinicDetail({ clinic, providers, onBack, onRefresh, onSelectProvider }) {
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('info')
  const [prov, setProv] = useState({ name: '', title: 'MD', npi: '', email: '', phone: '' })
  const [note, setNote] = useState('')
  const [activityType, setActivityType] = useState('Note')

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
  }

  return (
    <div>
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back to Accounts</button>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['info', 'providers', 'activity'].map(t => (
          <button key={t} className={tab === t ? 'btn' : 'btn secondary'} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>
      
      {tab === 'info' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <p><strong>Type:</strong> {clinic.type || '—'}</p>
            <p><strong>EMR:</strong> {clinic.emr || '—'}</p>
            <p><strong>Address:</strong> {clinic.address || '—'}</p>
            <p><strong>City:</strong> {clinic.city || '—'}, {clinic.state || ''}</p>
            <p><strong>Phone:</strong> {clinic.phone || '—'}</p>
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
              <div><span style={{ color: '#14b8a6' }}>{p.name}</span> <span style={{ color: '#9ca3af' }}>· {p.title}</span></div>
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
    </div>
  )
}

function ProviderDetail({ provider, onBack }) {
  return (
    <div>
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{provider.name}, {provider.title}</h3>
        <p style={{ marginBottom: 8 }}><strong>NPI:</strong> {provider.npi || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Email:</strong> {provider.email || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Phone:</strong> {provider.phone || '—'}</p>
        <p style={{ marginBottom: 8 }}><strong>Clinic:</strong> {provider.clinics?.name || '—'}</p>
        <p><strong>Samples:</strong> {provider.samples || 0}</p>
      </div>
    </div>
  )
}

function Providers({ providers, onSelect }) {
  const [search, setSearch] = useState('')
  const [routeMode, setRouteMode] = useState(false)
  const [routeAccounts, setRouteAccounts] = useState([])
  const filtered = providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..." style={{ marginBottom: 16, maxWidth: 280 }} />
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Title</th><th>Clinic</th><th>NPI</th><th>Samples</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#14b8a6' }}>{p.name}</td>
                <td>{p.title || '—'}</td>
                <td>{p.clinics?.name || '—'}</td>
                <td>{p.npi || '—'}</td>
                <td>{p.samples || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p style={{ color: '#6b7280', padding: 12 }}>No providers found.</p>}
      </div>
    </div>
  )
}

function Expenses({ expenses, clinics, onRefresh, role }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ business: '', amount: '', expense_date: '', exp_type: 'Meals', notes: '', city: '', clinic_id: '' })
  const canApprove = role === 'manager' || role === 'global_admin'
  const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  async function addExpense() {
    if (!form.amount) return
    await supabase.from('expenses').insert({ ...form, status: 'Ready' })
    setForm({ business: '', amount: '', expense_date: '', exp_type: 'Meals', notes: '', city: '', clinic_id: '' })
    setShowAdd(false)
    onRefresh()
  }

  async function updateStatus(id, status) {
    await supabase.from('expenses').update({ status }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ New Expense</button>
        <span style={{ fontWeight: 600, fontSize: 18 }}>${total.toLocaleString()}</span>
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
            <select value={form.clinic_id} onChange={e => setForm({...form, clinic_id: e.target.value || null})}>
              <option value="">Link to account (optional)</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" style={{ width: '100%', marginBottom: 10, minHeight: 60 }} />
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#9ca3af' }}>Receipt (optional)</label><br/>
            <input type="file" accept="image/*" style={{ marginTop: 4 }} />
          </div>
          <button className="btn" onClick={addExpense}>Save Expense</button>
          <button className="btn secondary" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Business</th><th>Type</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
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

function Reports({ clinics, expenses, providers }) {
  const byType = {}
  expenses.forEach(e => { byType[e.exp_type] = (byType[e.exp_type] || 0) + parseFloat(e.amount || 0) })
  const byStatus = {}
  expenses.forEach(e => { byStatus[e.status] = (byStatus[e.status] || 0) + 1 })

  return (
    <div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Monthly Volume</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 8 }}>
            {['Apr','May','Jun','Jul','Aug','Sep','Oct'].map((m, i) => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${30 + i * 12}px`, background: 'linear-gradient(to top, #0d9488, #14b8a6)', borderRadius: '4px 4px 0 0' }}></div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests by Panel</h3>
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#0d9488' }}>●</span> UTI</span><span>48%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#14b8a6' }}>●</span> Wound</span><span>32%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span style={{ color: '#5eead4' }}>●</span> SynoviFact</span><span>12%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{ color: '#99f6e4' }}>●</span> Other</span><span>8%</span></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Expenses by Type</h3>
        {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, amt]) => (
          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
            <span>{type}</span><span style={{ fontWeight: 600 }}>${amt.toLocaleString()}</span>
          </div>
        ))}
        {!Object.keys(byType).length && <p style={{ color: '#6b7280' }}>No expenses yet.</p>}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Summary</h3>
        <p style={{ marginBottom: 8 }}>Total Accounts: <strong>{clinics.length}</strong></p>
        <p style={{ marginBottom: 8 }}>Total Providers: <strong>{providers.length}</strong></p>
        <p style={{ marginBottom: 8 }}>Total Expenses: <strong>${expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0).toLocaleString()}</strong></p>
        <div style={{ marginTop: 16 }}>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{status}</span><span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}

function Training({ role }) {
  const [docs, setDocs] = useState([
    { name: 'Requisition Form', type: 'Global', category: 'Forms' },
    { name: 'SynoviFact Overview', type: 'Global', category: 'Product' },
    { name: 'Expense Policy', type: 'Global', category: 'Policies' }
  ])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('General')
  const canUpload = role === 'global_admin' || role === 'manager'

  function addDoc() {
    if (!name.trim()) return
    setDocs([...docs, { name, type: role === 'global_admin' ? 'Global' : 'Team', category }])
    setName('')
  }

  const categories = [...new Set(docs.map(d => d.category))]

  return (
    <div>
      {canUpload && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Document name" style={{ flex: 1 }} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option>General</option><option>Forms</option><option>Product</option><option>Policies</option><option>Onboarding</option>
            </select>
            <button className="btn" onClick={addDoc}>Add</button>
          </div>
        </div>
      )}
      {categories.map(cat => (
        <div key={cat} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 8, fontSize: 13, color: '#9ca3af', textTransform: 'uppercase' }}>{cat}</h3>
          {docs.filter(d => d.category === cat).map((d, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span>{d.name}</span>
              <span className="badge" style={{ background: d.type === 'Global' ? '#0d9488' : '#334155' }}>{d.type}</span>
            </div>
          ))}
        </div>
      ))}
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
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ clinic_id: '', date: '', type: 'Call', notes: '' })

  function addFollowup() {
    if (!form.date) return
    const clinic = clinics.find(c => c.id === form.clinic_id)
    setItems([...items, { ...form, id: Date.now(), clinicName: clinic?.name || 'General' }])
    setForm({ clinic_id: '', date: '', type: 'Call', notes: '' })
    setShowAdd(false)
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <button className="btn" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>+ Schedule Follow-up</button>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select value={form.clinic_id} onChange={e => setForm({...form, clinic_id: e.target.value})}>
              <option value="">Select account (optional)</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option>Call</option><option>Visit</option><option>Email</option><option>Meeting</option>
            </select>
            <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" />
          </div>
          <button className="btn" onClick={addFollowup}>Save</button>
        </div>
      )}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Upcoming</h3>
        {sorted.map(f => (
          <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{f.clinicName}</strong> · {f.type}
              {f.notes && <div style={{ color: '#6b7280', fontSize: 13 }}>{f.notes}</div>}
            </div>
            <span style={{ color: '#14b8a6' }}>{f.date}</span>
          </div>
        ))}
        {!sorted.length && <p style={{ color: '#6b7280' }}>No follow-ups scheduled.</p>}
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
