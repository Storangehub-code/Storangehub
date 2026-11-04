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

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      setProfile(data || { role: 'rep', full_name: session.user.email })
    } catch (err) {
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
      if (acc.error) throw acc.error
      if (prov.error) throw prov.error
      if (tst.error) throw tst.error
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

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'providers', label: 'Providers' },
    { id: 'tests', label: 'Tests' }
  ]

  if (!profile) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b1220', color: '#e5e7eb' }}>
      <div style={{ width: 220, background: '#111827', padding: '20px 12px', borderRight: '1px solid #1f2937' }}>
        <div style={{ padding: '0 12px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Response DX</div>
        </div>
        <div style={{ padding: '4px 12px', marginBottom: 16 }}>
          <span style={{ background: '#0d9488', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
        </div>
        {nav.map(n => (
          <div key={n.id} onClick={() => setPage(n.id)}
            style={{ padding: '10px 16px', cursor: 'pointer', borderRadius: 8, marginBottom: 4, background: page === n.id ? '#0d9488' : 'transparent', fontSize: 14 }}>
            {n.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 28, overflow: 'auto' }}>
        {error && <div style={{ background: '#7f1d1d', padding: 16, borderRadius: 8, marginBottom: 16 }}>Error: {error}</div>}
        {loading && <div style={{ padding: 20 }}>Loading data...</div>}
        {!loading && page === 'dashboard' && <DashboardHome accounts={accounts} providers={providers} tests={tests} />}
        {!loading && page === 'accounts' && <AccountsList accounts={accounts} />}
        {!loading && page === 'providers' && <ProvidersList providers={providers} />}
        {!loading && page === 'tests' && <TestsList tests={tests} />}
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

  const inactiveAccounts = accounts.length - activeAccounts

  const recentTests = tests.slice(0, 8)

  const topProviders = Object.entries(
    tests.reduce((acc, t) => {
      const name = t.provider_name || 'Unknown'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const panelCounts = tests.reduce((acc, t) => {
    const panel = t.panel || 'Other'
    acc[panel] = (acc[panel] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard value={totalTests} label="Total Tests" />
        <KpiCard value={activeAccounts} label="Active Accounts" />
        <KpiCard value={providers.length} label="Providers" />
        <KpiCard value={accounts.length} label="Total Accounts" />
        <KpiCard value={inactiveAccounts} label="Needs Attention" color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Recent Testing Activity</h3>
          {recentTests.map((t, i) => (
            <div key={t.accession || i} style={{ padding: '10px 0', borderBottom: '1px solid #374151', fontSize: 14 }}>
              <div><strong>{t.accession || '—'}</strong> · {t.provider_name || 'Unknown'}</div>
              <div style={{ color: '#9ca3af', fontSize: 13 }}>{t.clinic_name || '—'} · {t.panel || '—'} · {t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Top Providers</h3>
          {topProviders.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #374151', fontSize: 14 }}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1f2937', borderRadius: 12, padding: 20, marginTop: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Tests by Panel</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {Object.entries(panelCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([panel, count]) => (
            <div key={panel} style={{ background: '#111827', padding: '8px 14px', borderRadius: 8, fontSize: 13 }}>
              <strong>{count}</strong> · {panel}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ value, label, color }) {
  return (
    <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#fff' }}>{value}</div>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>{label}</div>
    </div>
  )
}

function AccountsList({ accounts }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Accounts ({accounts.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {accounts.slice(0, 100).map((a, i) => (
          <div key={a.id || a.clinic_code || i} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{a.name || 'Unnamed'}</strong>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{a.city || ''}, {a.state || ''} · {a.type || 'Clinic'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProvidersList({ providers }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Providers ({providers.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {providers.slice(0, 100).map((p, i) => (
          <div key={p.id || p.npi || i} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{p.last_name || ''}, {p.first_name || ''} {p.title || ''}</strong>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>NPI: {p.npi || '—'} · {p.clinic_code || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestsList({ tests }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Recent Tests ({tests.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {tests.slice(0, 50).map((t, i) => (
          <div key={t.accession || i} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{t.accession || '—'}</strong> — {t.provider_name || ''} · {t.clinic_name || ''}
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{t.panel || ''} · {t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
