import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [providers, setProviders] = useState([])
  const [tests, setTests] = useState([])
  const [clinics, setClinics] = useState([])
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [selectedMonth, setSelectedMonth] = useState(null)

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
      const [acc, prov, tst, clin] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('providers').select('*').order('last_name'),
        supabase.from('tests').select('*').order('collected', { ascending: false }).limit(10000),
        supabase.from('clinics').select('id, name'),
      ])
      setAccounts(acc.data || [])
      setProviders(prov.data || [])
      setTests(tst.data || [])
      setClinics(clin.data || [])
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
    { id: 'expenses', label: 'Expense Reports' },
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
          <div key={n.id} onClick={() => { setPage(n.id); setSelectedAccount(null); setSelectedProvider(null); setDateRange({ start: null, end: null }); setSelectedMonth(null) }}
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

          {!loading && page === 'dashboard' && (
            <DashboardHome
              accounts={accounts}
              providers={providers}
              tests={tests}
              clinics={clinics}
              dateRange={dateRange}
              setDateRange={setDateRange}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              onSelectAccount={setSelectedAccount}
              onSelectProvider={setSelectedProvider}
              setPage={setPage}
            />
          )}
          {!loading && page === 'accounts' && (
            selectedAccount
              ? <AccountDetail account={selectedAccount} tests={tests} providers={providers} clinics={clinics} onBack={() => setSelectedAccount(null)} />
              : <AccountsList accounts={accounts} tests={tests} clinics={clinics} onSelect={setSelectedAccount} />
          )}
          {!loading && page === 'providers' && (
            selectedProvider
              ? <ProviderDetail provider={selectedProvider} tests={tests} providers={providers} clinics={clinics} onBack={() => setSelectedProvider(null)} />
              : <ProvidersList providers={providers} tests={tests} clinics={clinics} onSelect={setSelectedProvider} />
          )}
          {!loading && page === 'reports' && <ReportsPage tests={tests} accounts={accounts} clinics={clinics} />}
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

function formatProviderName(p) {
  if (!p) return 'Unknown'
  const last = (p.last_name || '').trim()
  const first = (p.first_name || '').trim()
  const title = (p.title || '').trim()
  return `${last}, ${first}${title ? ' ' + title : ''}`.replace(/\s+/g, ' ').trim()
}

function reorderName(name) {
  if (!name) return 'Unknown'
  const parts = name.split(',').map(s => s.trim())
  if (parts.length === 2) {
    const rest = parts[1].split(' ')
    if (rest.length >= 2 && (rest[0].length <= 5 || rest[0].endsWith('.'))) {
      const title = rest[0]
      const first = rest.slice(1).join(' ')
      return `${parts[0]}, ${first} ${title}`.trim()
    }
  }
  return name
}

function getProviderName(t, providers = []) {
  if (t.provider_name) return reorderName(t.provider_name)
  if (t.provider_id && providers.length) {
    const match = providers.find(p => p.id === t.provider_id)
    if (match) return formatProviderName(match)
  }
  return 'Unknown'
}

function getClinicName(t, clinics = []) {
  if (t.clinic_name) return t.clinic_name
  if (t.clinic_id && clinics.length) {
    const match = clinics.find(c => c.id === t.clinic_id)
    if (match?.name) return match.name
  }
  return '—'
}

function getPanel(t) {
  return t.panel || t.test_type || '—'
}

function getCollected(t) {
  const raw = t.collected || t.collected_at
  if (!raw) return null
  // Prefer date-only portion to avoid timezone shifts
  const dateOnly = String(raw).split('T')[0].split(' ')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function getMonthFromTest(t) {
  const raw = t.collected || t.collected_at
  if (!raw) return null

  // If it's already a Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}`
  }

  const s = String(raw)
  // Extract YYYY-MM from the start of the string
  const match = s.match(/^(\d{4}-\d{2})/)
  if (match) return match[1]

  // Fallback: try parsing
  const d = getCollected(t)
  return d ? getMonthKey(d) : null
}

function getMonthKey(date) {
  if (!date) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function DashboardHome({ accounts, providers, tests, clinics, dateRange, setDateRange, selectedMonth, setSelectedMonth, onSelectAccount, onSelectProvider, setPage }) {
  const [recentPage, setRecentPage] = useState(0)
  const [attentionPage, setAttentionPage] = useState(0)

  const allDates = useMemo(() => {
    const dates = tests.map(t => getCollected(t)).filter(Boolean)
    if (!dates.length) return { min: new Date(), max: new Date() }
    const min = new Date(Math.min(...dates))
    const max = new Date()
    return { min, max }
  }, [tests])

  const filteredTests = useMemo(() => {
    let result = tests
    if (dateRange.start || dateRange.end) {
      result = result.filter(t => {
        const d = getCollected(t)
        if (!d) return false
        if (dateRange.start && d < dateRange.start) return false
        if (dateRange.end && d > dateRange.end) return false
        return true
      })
    }
    if (selectedMonth) {
      result = result.filter(t => getMonthFromTest(t) === selectedMonth)
    }
    return result
  }, [tests, dateRange, selectedMonth])

  const monthlyVolume = useMemo(() => {
    const map = {}
    tests.forEach(t => {
      const key = getMonthFromTest(t)
      if (key) map[key] = (map[key] || 0) + 1
    })

    // Always show the last 6 months ending with the current month
    const result = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({ month: key, count: map[key] || 0 })
    }
    return result
  }, [tests])

  const maxVolume = Math.max(...monthlyVolume.map(m => m.count), 1)

  const totalTests = filteredTests.length
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeAccounts = accounts.filter(a =>
    tests.some(t => getClinicName(t, clinics) === a.name && getCollected(t) && getCollected(t) > thirtyDaysAgo)
  ).length
  const needsAttention = accounts.length - activeAccounts

  const recentTests = filteredTests.slice(recentPage * 10, (recentPage + 1) * 10)
  const attentionAccounts = accounts.filter(a =>
    !tests.some(t => getClinicName(t, clinics) === a.name && getCollected(t) && getCollected(t) > thirtyDaysAgo)
  ).slice(attentionPage * 10, (attentionPage + 1) * 10)

  const topProviders = Object.entries(
    filteredTests.reduce((acc, t) => {
      const name = getProviderName(t, providers)
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const topAccounts = Object.entries(
    filteredTests.reduce((acc, t) => {
      const name = getClinicName(t, clinics)
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const panelCounts = filteredTests.reduce((acc, t) => {
    const panel = getPanel(t)
    acc[panel] = (acc[panel] || 0) + 1
    return acc
  }, {})

  const estimatedRevenue = totalTests * 125

  const rangeLabel = selectedMonth
    ? (() => {
        const [y, m] = selectedMonth.split('-')
        const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
        return `${names[Number(m) - 1]} ${y}`
      })()
    : (dateRange.start || dateRange.end
        ? `${dateRange.start ? dateRange.start.toLocaleDateString() : 'Start'} – ${dateRange.end ? dateRange.end.toLocaleDateString() : 'End'}`
        : 'All Time')

  const startVal = dateRange.start ? dateRange.start.getTime() : allDates.min.getTime()
  const endVal = dateRange.end ? dateRange.end.getTime() : allDates.max.getTime()

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px' }}>Dashboard</h2>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>{rangeLabel} · Click a month on the chart to filter</div>
      </div>

      <div style={{ background: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 13, marginBottom: 12 }}>Date of Service</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, minWidth: 90 }}>{new Date(startVal).toLocaleDateString()}</div>
          <input
            type="range"
            min={allDates.min.getTime()}
            max={allDates.max.getTime()}
            value={startVal}
            onChange={e => {
              const val = Number(e.target.value)
              if (val < endVal) setDateRange(prev => ({ ...prev, start: new Date(val) }))
              setSelectedMonth(null)
            }}
            style={{ flex: 1 }}
          />
          <input
            type="range"
            min={allDates.min.getTime()}
            max={allDates.max.getTime()}
            value={endVal}
            onChange={e => {
              const val = Number(e.target.value)
              if (val > startVal) setDateRange(prev => ({ ...prev, end: new Date(val) }))
              setSelectedMonth(null)
            }}
            style={{ flex: 1 }}
          />
          <div style={{ fontSize: 13, minWidth: 90, textAlign: 'right' }}>{new Date(endVal).toLocaleDateString()}</div>
          <button onClick={() => { setDateRange({ start: null, end: null }); setSelectedMonth(null) }} style={{ padding: '6px 14px', borderRadius: 6, background: '#374151', color: 'white', border: 'none', cursor: 'pointer' }}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard value={totalTests.toLocaleString()} label="Tests" sub={rangeLabel} />
        <KpiCard value={activeAccounts} label="Active Accounts" sub="Ordered in last 30 days" />
        <KpiCard value={providers.length} label="Providers" />
        <KpiCard value={`$${estimatedRevenue.toLocaleString()}`} label="Est. Test Revenue" sub="$125 / test" />
        <KpiCard value={needsAttention} label="Accounts Need Attention" color="#ef4444" sub="No specimens in 30+ days" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 0.9fr', gap: 16, marginBottom: 16 }}>
        <Card title="Monthly Testing Volume (Last 6 Months)">
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 10, justifyContent: 'center' }}>
            {monthlyVolume.map(({ month, count }) => (
              <div key={month} onClick={() => setSelectedMonth(selectedMonth === month ? null : month)} style={{ width: 48, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ height: Math.max(8, (count / maxVolume) * 150), background: selectedMonth === month ? '#14b8a6' : '#0d9488', borderRadius: 4, margin: '0 auto 6px', transition: 'all 0.15s' }} />
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{month.slice(5)}/{month.slice(2, 4)}</div>
              </div>
            ))}
          </div>
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
            <div key={name} onClick={() => { const p = providers.find(pr => formatProviderName(pr) === name || name.includes(pr.last_name)); if (p) { onSelectProvider(p); setPage('providers') } }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #374151', fontSize: 13, cursor: 'pointer' }}>
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
                  <td style={{ padding: '8px 0' }}>{t.accession || t.accession_number || '—'}</td>
                  <td>{getCollected(t) ? getCollected(t).toLocaleDateString() : '—'}</td>
                  <td>{getPanel(t)}</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => { const p = providers.find(pr => getProviderName(t, providers).includes(pr.last_name)); if (p) { onSelectProvider(p); setPage('providers') } }}>{getProviderName(t, providers)}</td>
                  <td style={{ cursor: 'pointer' }} onClick={() => { const a = accounts.find(acc => getClinicName(t, clinics) === acc.name); if (a) { onSelectAccount(a); setPage('accounts') } }}>{getClinicName(t, clinics)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
            <button disabled={recentPage === 0} onClick={() => setRecentPage(p => p - 1)} style={{ padding: '4px 10px', borderRadius: 4, background: '#374151', color: 'white', border: 'none', cursor: recentPage === 0 ? 'default' : 'pointer', opacity: recentPage === 0 ? 0.5 : 1 }}>Prev</button>
            <span>Page {recentPage + 1}</span>
            <button disabled={recentTests.length < 10} onClick={() => setRecentPage(p => p + 1)} style={{ padding: '4px 10px', borderRadius: 4, background: '#374151', color: 'white', border: 'none', cursor: recentTests.length < 10 ? 'default' : 'pointer', opacity: recentTests.length < 10 ? 0.5 : 1 }}>Next</button>
          </div>
        </Card>

        <Card title="Accounts Needing Attention">
          {attentionAccounts.map(a => (
            <div key={a.id || a.name} onClick={() => { onSelectAccount(a); setPage('accounts') }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13, cursor: 'pointer' }}>
              <span>{a.name}</span>
              <span style={{ color: '#ef4444', fontSize: 12 }}>30+</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
            <button disabled={attentionPage === 0} onClick={() => setAttentionPage(p => p - 1)} style={{ padding: '4px 10px', borderRadius: 4, background: '#374151', color: 'white', border: 'none', cursor: attentionPage === 0 ? 'default' : 'pointer', opacity: attentionPage === 0 ? 0.5 : 1 }}>Prev</button>
            <span>Page {attentionPage + 1}</span>
            <button disabled={attentionAccounts.length < 10} onClick={() => setAttentionPage(p => p + 1)} style={{ padding: '4px 10px', borderRadius: 4, background: '#374151', color: 'white', border: 'none', cursor: attentionAccounts.length < 10 ? 'default' : 'pointer', opacity: attentionAccounts.length < 10 ? 0.5 : 1 }}>Next</button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card title="Top Performing Accounts">
          {topAccounts.map(([name, count]) => (
            <div key={name} onClick={() => { const a = accounts.find(acc => acc.name === name); if (a) { onSelectAccount(a); setPage('accounts') } }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13, cursor: 'pointer' }}>
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

function AccountsList({ accounts, tests, clinics, onSelect }) {
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

function AccountDetail({ account, tests, providers, clinics, onBack }) {
  const accountTests = tests.filter(t => getClinicName(t, clinics) === account.name)
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
              {formatProviderName(p)} · NPI {p.npi || '—'}
            </div>
          ))}
        </Card>
        <Card title={`Recent Tests (${accountTests.length})`}>
          {accountTests.slice(0, 10).map(t => (
            <div key={t.accession} style={{ padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
              {t.accession || t.accession_number} · {getPanel(t)} · {getCollected(t) ? getCollected(t).toLocaleDateString() : '—'}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function ProvidersList({ providers, tests, clinics, onSelect }) {
  const [search, setSearch] = useState('')
  const withCounts = providers.map(p => ({
    ...p,
    count: tests.filter(t => getProviderName(t, providers).includes(p.last_name)).length
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
              <strong>{formatProviderName(p)}</strong>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>NPI: {p.npi || '—'} · {p.clinic_code || '—'}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{p.count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProviderDetail({ provider, tests, providers, clinics, onBack }) {
  const providerTests = tests.filter(t => getProviderName(t, providers).includes(provider.last_name))
  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, background: '#374151', color: 'white', border: 'none', cursor: 'pointer' }}>← Back</button>
      <h2>{formatProviderName(provider)}</h2>
      <p style={{ color: '#9ca3af' }}>NPI: {provider.npi || '—'} · Clinic: {provider.clinic_code || '—'}</p>
      <Card title={`Tests (${providerTests.length})`} style={{ marginTop: 20 }}>
        {providerTests.slice(0, 15).map(t => (
          <div key={t.accession} style={{ padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
            {t.accession || t.accession_number} · {getPanel(t)} · {getCollected(t) ? getCollected(t).toLocaleDateString() : '—'}
          </div>
        ))}
      </Card>
    </div>
  )
}

function ReportsPage({ tests, accounts, clinics }) {
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
      <h2>Expense Reports</h2>
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
