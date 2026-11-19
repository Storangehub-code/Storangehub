import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DashboardHome from './DashboardHome'
import Accounts from './Accounts'
import ApproveAccounts from './ApproveAccounts'
import Prospects from './Prospects'
import ClinicDetail from './ClinicDetail'
import Providers from './Providers'
import ProviderDetail from './ProviderDetail'
import Tests from './Tests'
import Reps from './Reps'
import Managers from './Managers'
import Expenses from './Expenses'
import Reports from './Reports'
import Followups from './Followups'
import Training from './Training'
import Users from './Users'
import MasterLog from './MasterLog'
import NotificationBell from '../components/NotificationBell'
import PushRegister from '../components/PushRegister'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [clinics, setClinics] = useState([])
  const [providers, setProviders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [tests, setTests] = useState([])
  const [page, setPage] = useState('dashboard')
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [selectedReps, setSelectedReps] = useState([])
  const [reps, setReps] = useState([])

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (profile) loadData() }, [profile])

  // Hash routing: read on load, listen for changes
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace('#/', '') || 'dashboard'
      setPage(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  function go(id) {
    window.location.hash = '#/' + id
  }

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).single()
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
    const { data: allProfiles } = await supabase.from('profiles').select('*')
    const repsData = (allProfiles || []).filter(r => r.role === 'rep')
    setReps(repsData)
    if (profile?.role === 'rep') {
      setSelectedReps([session.user.id])
    } else if (profile?.role === 'manager') {
      const team = repsData.filter(r => r.manager_id === session.user.id).map(r => r.id)
      setSelectedReps(team.length ? team : [session.user.id])
    } else {
      setSelectedReps([])
    }
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
      <PushRegister userId={session.user.id} />
      <div style={{ width: 220, background: '#111827', padding: '20px 12px', borderRight: '1px solid #1f2937' }}>
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <img src="/logo.png" alt="Response DX" style={{ height: 40, marginBottom: 4 }} />
        </div>
        <div style={{ padding: '4px 12px', marginBottom: 16 }}>
          <span style={{ background: '#0d9488', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
        </div>
        {nav.map(n => (
          <div key={n.id} onClick={() => { if (!n.disabled) { setSelectedClinic(null); setSelectedProvider(null); go(n.id) } }}
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
            <NotificationBell userId={session.user.id} onOpen={(n) => {
              if (n.clinic_id) {
                const c = clinics.find(x => x.id === n.clinic_id)
                if (c) { setSelectedClinic(c); go(c.is_prospect ? 'prospects' : 'accounts') }
              }
            }} />
            <span style={{ fontSize: 14, color: '#9ca3af' }}>{profile.full_name || session.user.email}</span>
            <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Log Out</button>
          </div>
        </div>

        {page === 'dashboard' && <DashboardHome clinics={clinics} providers={providers} tests={tests} selectedReps={selectedReps} reps={reps} onSelectClinic={(c) => { setSelectedClinic(c); go('accounts') }} onSelectProvider={(p) => { setSelectedProvider(p); go('providers') }} setPage={go} />}
        {page === 'approve' && role === 'global_admin' && <ApproveAccounts clinics={clinics} reps={reps} onRefresh={loadData} />}
        {page === 'prospects' && !selectedClinic && <Prospects clinics={clinics} onRefresh={loadData} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} currentUser={session.user} />}
        {page === 'prospects' && selectedClinic && <ClinicDetail clinic={selectedClinic} providers={providers} tests={tests} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} />}
        {page === 'accounts' && !selectedClinic && <Accounts clinics={clinics} tests={tests} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} role={role} onAddProspect={() => go('prospects')} />}
        {page === 'accounts' && selectedClinic && !selectedProvider && <ClinicDetail clinic={selectedClinic} providers={providers} tests={tests} onBack={() => setSelectedClinic(null)} onRefresh={loadData} onSelectProvider={setSelectedProvider} />}
        {selectedProvider && page === 'providers' && <ProviderDetail provider={selectedProvider} tests={tests} clinics={clinics} onBack={() => setSelectedProvider(null)} onSelectClinic={(c) => { setSelectedProvider(null); setSelectedClinic(c); go('accounts') }} />}
        {page === 'providers' && !selectedProvider && <Providers providers={providers} clinics={clinics} tests={tests} onSelect={setSelectedProvider} onSelectClinic={(c) => { setSelectedClinic(c); go('accounts') }} selectedReps={selectedReps} />}
        {page === 'tests' && <Tests tests={tests} clinics={clinics} providers={providers} onSelectClinic={(c) => { setSelectedClinic(c); go('accounts') }} onSelectProvider={(p) => { setSelectedProvider(p); go('providers') }} selectedReps={selectedReps} />}
        {page === 'reps' && <Reps selected={selectedReps} setSelected={setSelectedReps} clinics={clinics} tests={tests} role={role} />}
        {page === 'managers' && <Managers />}
        {page === 'expenses' && <Expenses expenses={expenses} clinics={clinics} providers={providers} onRefresh={loadData} role={role} session={session} />}
        {page === 'reports' && <Reports clinics={clinics} tests={tests} providers={providers} selectedReps={selectedReps} />}
        {page === 'followups' && <Followups clinics={clinics} session={session} />}
        {page === 'training' && <Training role={role} />}
        {page === 'users' && role === 'global_admin' && <Users />}
        {page === 'master' && isMaster && <MasterLog />}
      </div>
    </div>
  )
}
