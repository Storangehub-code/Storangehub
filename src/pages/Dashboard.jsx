import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [providers, setProviders] = useState([])
  const [tests, setTests] = useState([])
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single()
    setProfile(data || { role: 'rep', full_name: session.user.email })
  }

  async function loadData() {
    setLoading(true)
    const [acc, prov, tst] = await Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('providers').select('*').order('last_name'),
      supabase.from('tests').select('*').order('collected_at', { ascending: false })
    ])
    setAccounts(acc.data || [])
    setProviders(prov.data || [])
    setTests(tst.data || [])
    setLoading(false)
  }

  const role = profile?.role || 'rep'
  const roleLabel = { global_admin: 'Global Admin', manager: 'Manager', rep: 'Rep' }[role] || 'Rep'

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'providers', label: 'Providers' },
    { id: 'tests', label: 'Tests' },
    { id: 'reports', label: 'Reports' }
  ]

  if (!profile) return <div style={{ padding: 40 }}>Loading...</div>
  if (loading) return <div style={{ padding: 40 }}>Loading data...</div>

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
        {page === 'dashboard' && <DashboardHome accounts={accounts} providers={providers} tests={tests} />}
        {page === 'accounts' && <AccountsList accounts={accounts} tests={tests} />}
        {page === 'providers' && <ProvidersList providers={providers} accounts={accounts} tests={tests} />}
        {page === 'tests' && <TestsList tests={tests} />}
        {page === 'reports' && <Reports accounts={accounts} tests={tests} providers={providers} />}
      </div>
    </div>
  )
}

function DashboardHome({ accounts, providers, tests }) {
  const totalTests = tests.length
  const activeAccounts = accounts.filter(a => {
    const recent = tests.filter(t => t.clinic_name === a.name && new Date(t.collected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    return recent.length > 0
  }).length

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalTests}</div>
          <div style={{ color: '#9ca3af' }}>Total Tests</div>
        </div>
        <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeAccounts}</div>
          <div style={{ color: '#9ca3af' }}>Active Accounts</div>
        </div>
        <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{providers.length}</div>
          <div style={{ color: '#9ca3af' }}>Providers</div>
        </div>
        <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{accounts.length}</div>
          <div style={{ color: '#9ca3af' }}>Total Accounts</div>
        </div>
      </div>
      <p style={{ color: '#64748b' }}>Live data from Supabase — {tests.length} tests loaded.</p>
    </div>
  )
}

function AccountsList({ accounts, tests }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Accounts ({accounts.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {accounts.slice(0, 50).map(a => (
          <div key={a.id || a.clinic_code} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{a.name}</strong>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{a.city}, {a.state} · {a.type || 'Clinic'}</div>
          </div>
        ))}
      </div>
      {accounts.length > 50 && <p style={{ marginTop: 12, color: '#64748b' }}>Showing first 50 of {accounts.length}</p>}
    </div>
  )
}

function ProvidersList({ providers, accounts, tests }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Providers ({providers.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {providers.slice(0, 50).map(p => (
          <div key={p.id || p.npi} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{p.last_name}, {p.first_name} {p.title}</strong>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>NPI: {p.npi} · {p.clinic_code || '—'}</div>
          </div>
        ))}
      </div>
      {providers.length > 50 && <p style={{ marginTop: 12, color: '#64748b' }}>Showing first 50 of {providers.length}</p>}
    </div>
  )
}

function TestsList({ tests }) {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Recent Tests ({tests.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {tests.slice(0, 25).map(t => (
          <div key={t.accession} style={{ background: '#1f2937', padding: 12, borderRadius: 8 }}>
            <strong>{t.accession}</strong> — {t.provider_name} · {t.clinic_name}
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{t.panel} · {t.collected_at ? new Date(t.collected_at).toLocaleDateString() : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Reports({ accounts, tests, providers }) {
  return (
    <div>
      <h2>Reports</h2>
      <p>Total tests: {tests.length}</p>
      <p>Accounts: {accounts.length}</p>
      <p>Providers: {providers.length}</p>
    </div>
  )
}
