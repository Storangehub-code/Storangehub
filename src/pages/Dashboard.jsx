import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [providers, setProviders] = useState([])
  const [tests, setTests] = useState([])
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  async function loadProfile() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .single()
      setProfile(data || { role: 'rep', full_name: session.user.email })
    } catch {
      setProfile({ role: 'rep', full_name: session.user.email })
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [acc, prov, tst] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('providers').select('*').order('last_name'),
        supabase.from('tests').select('*').order('collected_at', { ascending: false })
      ])
      setAccounts(acc.data || [])
      setProviders(prov.data || [])
      setTests(tst.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const role = profile?.role || 'rep'
  const roleLabel = { global_admin: 'Global Admin', manager: 'Manager', rep: 'Rep' }[role] || 'Rep'
  const userName = profile?.full_name || session.user.email

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'providers', label: 'Surgeons / Providers' },
    { id: 'reports', label: 'Reports' },
    { id: 'followups', label: 'Tasks & Follow-ups' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'prospects', label: 'Prospects' },
    ...(role !== 'rep' ? [{ id: 'reps', label: 'Reps' }] : []),
    ...(role === 'global_admin' ? [
      { id: 'managers', label: 'Managers' },
      { id: 'input', label: 'Input Tests' },
      { id: 'admin', label: 'Admin' }
    ] : []),
    { id: 'training', label: 'Training' }
  ]

  if (!profile) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b1220', color: '#e5e7eb' }}>
      <div style={{ width: 230, background: '#111827', padding: '20px 12px', borderRight: '1px solid #1f2937', flexShrink: 0 }}>
        <div style={{ padding: '0 12px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Response DX</div>
        </div>
        <div style={{ padding: '4px 12px', marginBottom: 16 }}>
          <span style={{ background: '#0d9488', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
        </div>
        {nav.map(n => (
          <div key={n.id} onClick={() => { setPage(n.id); setSelectedAccount(null); setSelectedProvider(null) }}
            style={{ padding: '10px 16px', cursor: 'pointer', borderRadius: 8, marginBottom: 4, background: page === n.id ? '#0d9488' : 'transparent', fontSize: 14 }}>
            {n.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#111827', padding: '12px 28px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>ResponseDx CRM</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14 }}>{userName}</span>
            <span style={{ background: '#0d9488', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: 28, overflow: 'auto' }}>
          {error && <div style={{ background: '#7f1d1d', padding: 16, borderRadius: 8, marginBottom: 16 }}>Error: {error}</div>}
          {loading && <div style={{ padding: 20 }}>Loading data...</div>}

          {!loading && page === 'dashboard' && <DashboardHome accounts={accounts} providers={providers} tests={tests} />}
          {!loading && page === 'accounts' && (
            selectedAccount
              ? <AccountDetail account={selectedAccount} tests={tests} providers={providers} onBack={() => setSelectedAccount(null)} />
              : <AccountsList accounts={accounts} tests={tests} onSelect={setSelectedAccount} />
          )}
          {!loading && page === 'providers' && (
            selectedProvider
              ? <ProviderDetail provider={selectedProvider} tests={tests} onBack={() => setSelectedProvider(null)} />
              : <ProvidersList providers={providers} tests={tests} onSelect={setSelectedProvider} />
          )}
          {!loading && page === 'reports' && <ReportsPage tests={tests} accounts={accounts} />}
          {!loading && page === 'followups' && <FollowupsPage />}
          {!loading && page === 'expenses' && <ExpensesPage />}
          {!loading && page === 'prospects' && <ProspectsPage />}
          {!loading && page === 'reps' && <RepsPage />}
          {!loading && page === 'managers' && <ManagersPage />}
          {!loading && page === 'input' && <InputTestsPage />}
          {!loading && page === 'admin' && <AdminPage />}
          {!loading && page === 'training' && <TrainingPage />}
        </div>
      </div>
    </div>
  )
}

function DashboardHome({ accounts, providers, tests }) {
  const totalTests = tests.length
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeAccounts = accounts.filter(a =>
    tests.some(t => t.clinic_name === a.name && t.collected_at && new Date(t.collected_at) > thirtyDaysAgo)
  ).length
  const needsAttention = accounts.length - activeAccounts

  const recentTests = tests.slice(0, 10)

  const topProviders = Object.entries(
    tests.reduce((acc, t) => {
      const name = t.provider_name || 'Unknown'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const topAccounts = Object.entries(
    tests.reduce((acc, t) => {
      const name = t.clinic_name || 'Unknown'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const panelCounts = tests.reduce((acc, t) => {
    const panel = t.panel || 'Other'
    acc[panel] = (acc[panel] || 0) + 1
    return acc
  }, {})

  const estimatedRevenue = totalTests * 125

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px' }}>Dashboard</h2>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>Live data · Salesperson shown on clinic detail where available</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard value={totalTests.toLocaleString()} label="Tests (All)" sub="Live total" />
        <KpiCard value={activeAccounts} label="Active Accounts" sub="Ordered in last 30 days" />
        <KpiCard value={providers.length} label="Providers" />
        <KpiCard value={`$${estimatedRevenue.toLocaleString()}`} label="Est. Test Revenue" sub="$125 / test" />
        <KpiCard value={needsAttention} label="Accounts Need Attention" color="#ef4444" sub="No specimens in 30+ days" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 0.9fr', gap: 16, marginBottom: 16 }}>
        <Card title="Monthly Testing Volume">
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 10 }}>
            {['Apr','May','Jun','Jul','Aug','Sep','Oct'].map((m, i) => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 40 + i * 18, background: '#0d9488', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{m}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Placeholder chart — monthly breakdown coming next</div>
        </Card>

        <Card title="Tests by Panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(panelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([panel, count]) => (
              <div key={panel} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{panel}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Providers by Testing Volume">
          {topProviders.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Recent Testing Activity">
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#9ca3af', textAlign: 'left' }}>
                <th style={{ padding: '6px 0' }}>Accession</th>
                <th>Collected</th>
                <th>Test</th>
                <th>Provider</th>
                <th>Practice</th>
              </tr>
            </thead>
            <tbody>
              {recentTests.map((t, i) => (
                <tr key={t.accession || i} style={{ borderTop: '1px solid #374151' }}>
                  <td style={{ padding: '8px 0' }}>{t.accession || '—'}</td>
                  <td>{t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}</td>
                  <td>{t.panel || '—'}</td>
                  <td>{t.provider_name || 'Unknown'}</td>
                  <td>{t.clinic_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Accounts Needing Attention">
          {accounts.filter(a => !tests.some(t => t.clinic_name === a.name && t.collected_at && new Date(t.collected_at) > thirtyDaysAgo)).slice(0, 6).map(a => (
            <div key={a.id || a.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
              <span>{a.name}</span>
              <span style={{ color: '#ef4444', fontSize: 12 }}>30+</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card title="Top Performing Accounts">
          {topAccounts.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </Card>
        <Card title="Manager Performance">
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Coming soon with role data</div>
        </Card>
        <Card title="Rep Performance">
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Coming soon with role data</div>
        </Card>
      </div>
    </div>
  )
}

function AccountsList({ accounts, tests, onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = accounts.filter(a =>
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.city || '').toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Accounts ({accounts.length})</h2>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." style={{ width: '100%', maxWidth: 400, padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: 'white', marginBottom: 16 }} />
      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.slice(0, 100).map((a, i) => (
          <div key={a.id || a.clinic_code || i} onClick={() => onSelect(a)} style={{ background: '#1f2937', padding: 14, borderRadius: 8, cursor: 'pointer' }}>
            <strong>{a.name || 'Unnamed'}</strong>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{a.city || ''}, {a.state || ''} · {a.type || 'Clinic'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountDetail({ account, tests, providers, onBack }) {
  const accountTests = tests.filter(t => t.clinic_name === account.name)
  const accountProviders = providers.filter(p => p.clinic_code === account.clinic_code)
  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, background: '#374151', color: 'white', border: 'none', cursor: 'pointer' }}>← Back</button>
      <h2>{account.name}</h2>
      <p style={{ color: '#9ca3af' }}>{account.city}, {account.state} · {account.type || 'Clinic'} · {account.phone || ''}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <Card title={`Providers (${accountProviders.length})`}>
          {accountProviders.map(p => (
            <div key={p.id || p.npi} style={{ padding: '8px 0', borderBottom: '1px solid #374151' }}>
              {p.last_name}, {p.first_name} {p.title} · NPI {p.npi || '—'}
            </div>
          ))}
        </Card>
        <Card title={`Recent Tests (${accountTests.length})`}>
          {accountTests.slice(0, 10).map(t => (
            <div key={t.accession} style={{ padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
              {t.accession} · {t.panel} · {t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function ProvidersList({ providers, tests, onSelect }) {
  const [search, setSearch] = useState('')
  const withCounts = providers.map(p => ({
    ...p,
    count: tests.filter(t => t.provider_name && t.provider_name.includes(p.last_name)).length
  })).sort((a, b) => b.count - a.count)
  const filtered = withCounts.filter(p =>
    `${p.last_name} ${p.first_name}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Surgeons / Providers ({providers.length})</h2>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..." style={{ width: '100%', maxWidth: 400, padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#1f2937', color: 'white', marginBottom: 16 }} />
      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.slice(0, 100).map((p, i) => (
          <div key={p.id || p.npi || i} onClick={() => onSelect(p)} style={{ background: '#1f2937', padding: 14, borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{p.last_name}, {p.first_name} {p.title}</strong>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>NPI: {p.npi || '—'} · {p.clinic_code || '—'}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{p.count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProviderDetail({ provider, tests, onBack }) {
  const providerTests = tests.filter(t => t.provider_name && t.provider_name.includes(provider.last_name))
  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, background: '#374151', color: 'white', border: 'none', cursor: 'pointer' }}>← Back</button>
      <h2>{provider.last_name}, {provider.first_name} {provider.title}</h2>
      <p style={{ color: '#9ca3af' }}>NPI: {provider.npi || '—'} · Clinic: {provider.clinic_code || '—'}</p>
      <Card title={`Tests (${providerTests.length})`} style={{ marginTop: 20 }}>
        {providerTests.slice(0, 15).map(t => (
          <div key={t.accession} style={{ padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
            {t.accession} · {t.panel} · {t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}
          </div>
        ))}
      </Card>
    </div>
  )
}

function ReportsPage({ tests, accounts }) {
  return (
    <div>
      <h2>Reports</h2>
      <p style={{ color: '#9ca3af' }}>Sample volume and activity reports using live data.</p>
      <Card title="Summary" style={{ marginTop: 20 }}>
        <div>Total Tests: <strong>{tests.length}</strong></div>
        <div>Accounts: <strong>{accounts.length}</strong></div>
      </Card>
    </div>
  )
}

function FollowupsPage() {
  return (
    <div>
      <h2>Tasks & Follow-ups</h2>
      <p style={{ color: '#9ca3af' }}>Calendar and follow-up tracking will be restored here.</p>
      <Card title="Upcoming" style={{ marginTop: 20 }}>
        <p>No follow-ups loaded yet.</p>
      </Card>
    </div>
  )
}

function ExpensesPage() {
  return (
    <div>
      <h2>Expenses</h2>
      <p style={{ color: '#9ca3af' }}>Expense reporting and approvals will be restored here.</p>
    </div>
  )
}

function ProspectsPage() {
  return (
    <div>
      <h2>Prospects</h2>
      <p style={{ color: '#9ca3af' }}>Prospect tracking and conversion will be restored here.</p>
    </div>
  )
}

function RepsPage() {
  return <div><h2>Reps</h2><p style={{ color: '#9ca3af' }}>Rep management will be restored here.</p></div>
}

function ManagersPage() {
  return <div><h2>Managers</h2><p style={{ color: '#9ca3af' }}>Manager management will be restored here.</p></div>
}

function InputTestsPage() {
  return <div><h2>Input Tests</h2><p style={{ color: '#9ca3af' }}>Daily test upload will be restored here.</p></div>
}

function AdminPage() {
  return <div><h2>Admin</h2><p style={{ color: '#9ca3af' }}>User management will be restored here.</p></div>
}

function TrainingPage() {
  return <div><h2>Training</h2><p style={{ color: '#9ca3af' }}>Training documents will be restored here.</p></div>
}

function KpiCard({ value, label, sub, color }) {
  return (
    <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#fff' }}>{value}</div>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>{label}</div>
      {sub && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children, style }) {
  return (
    <div style={{ background: '#1f2937', borderRadius: 12, padding: 18, ...style }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>{title}</h3>
      {children}
    </div>
  )
}
