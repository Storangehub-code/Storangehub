import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Followups from './Followups'
import Reps from './Reps'
import Managers from './Managers'
import Users from './Users'
import MasterLog from './MasterLog'
import Accounts from './Accounts'
import Providers from './Providers'
import Expenses from './Expenses'
import Reports from './Reports'
import Prospects from './Prospects'
import Tests from './Tests'
import Training from './Training'
import ApproveAccounts from './ApproveAccounts'

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
    const { data: repsData } = await supabase.from('profiles').select('*').eq('role', 'rep')
    setReps(repsData || [])
    if (profile?.role === 'rep') setSelectedReps([session.user.id])
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
    { id: 'expenses', label: 'Expenses' },
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
            <span style={{ fontSize: 14, color: '#9ca3af' }}>{profile.full_name || session.user.email}</span>
            <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Log Out</button>
          </div>
        </div>

        {page === 'accounts' && <Accounts clinics={clinics} tests={tests} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} role={role} />}
        {page === 'prospects' && <Prospects clinics={clinics} onSelect={setSelectedClinic} selectedReps={selectedReps} reps={reps} />}
        {page === 'approve' && role === 'global_admin' && <ApproveAccounts clinics={clinics} onRefresh={loadData} />}
        {page === 'providers' && <Providers providers={providers} clinics={clinics} tests={tests} onSelect={setSelectedProvider} selectedReps={selectedReps} />}
        {page === 'tests' && <Tests tests={tests} clinics={clinics} providers={providers} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} selectedReps={selectedReps} />}
        {page === 'expenses' && <Expenses expenses={expenses} clinics={clinics} providers={providers} onRefresh={loadData} role={role} session={session} />}
        {page === 'reports' && <Reports clinics={clinics} tests={tests} providers={providers} selectedReps={selectedReps} />}
        {page === 'followups' && <Followups clinics={clinics} session={session} />}
        {page === 'training' && <Training role={role} />}
        {page === 'reps' && <Reps selected={selectedReps} setSelected={setSelectedReps} clinics={clinics} tests={tests} role={role} />}
        {page === 'managers' && <Managers />}
        {page === 'users' && role === 'global_admin' && <Users />}
        {page === 'master' && isMaster && <MasterLog />}
        
        {page === 'dashboard' && <DashboardHome clinics={clinics} providers={providers} tests={tests} selectedReps={selectedReps} reps={reps} onSelectClinic={setSelectedClinic} onSelectProvider={setSelectedProvider} setPage={setPage} />}
      </div>
    </div>
  )
}
