import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatProviderName(p) {
  const parts = (p.name || '').split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return p.name || 'Unknown'
}

export default function ClinicDetail({ clinic, providers = [], tests = [], onBack, onSelectProvider, onRefresh }) {
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProvider, setNewProvider] = useState({ first: '', last: '', title: '', email: '', phone: '', npi: '' })
  const [saving, setSaving] = useState(false)

  const [activities, setActivities] = useState([])
  const [activityType, setActivityType] = useState('Meeting')
  const [activityNotes, setActivityNotes] = useState('')
  const [showFollowup, setShowFollowup] = useState(false)
  const [followups, setFollowups] = useState([])
  const [editingFollowup, setEditingFollowup] = useState(null)
  const [followupForm, setFollowupForm] = useState({ date: '', time: '', type: 'Call', notes: '', warn: '1 day' })

  const clinicProviders = providers.filter(p => p.clinic_id === clinic.id)
  const clinicTests = tests.filter(t => t.clinic_id === clinic.id)

  const testCounts = {}
  clinicTests.forEach(t => { testCounts[t.test_type || 'Unknown'] = (testCounts[t.test_type || 'Unknown'] || 0) + 1 })

  useEffect(() => {
    loadActivities()
    loadFollowups()
  }, [clinic.id])

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*').eq('clinic_id', clinic.id).order('created_at', { ascending: false })
    setActivities(data || [])
  }

  async function loadFollowups() {
    const { data } = await supabase.from('followups').select('*').eq('clinic_id', clinic.id).order('scheduled_at', { ascending: true })
    setFollowups(data || [])
  }

  async function logActivity() {
    if (!activityNotes.trim()) {
      alert('Please enter notes')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('activities').insert({
      clinic_id: clinic.id,
      activity_type: activityType,
      notes: activityNotes,
      created_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setActivityNotes('')
      loadActivities()
      setShowFollowup(true)
    }
  }

  async function saveFollowup() {
    if (!followupForm.date) {
      alert('Please select a date')
      return
    }
    setSaving(true)
    const scheduled_at = `${followupForm.date}T${followupForm.time || '09:00'}:00`
    const payload = {
      clinic_id: clinic.id,
      scheduled_at,
      followup_type: followupForm.type,
      notes: followupForm.notes,
      warn_before: followupForm.warn
    }
    let error
    if (editingFollowup) {
      const res = await supabase.from('followups').update(payload).eq('id', editingFollowup.id)
      error = res.error
    } else {
      const res = await supabase.from('followups').insert(payload)
      error = res.error
    }
    setSaving(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowFollowup(false)
      setEditingFollowup(null)
      setFollowupForm({ date: '', time: '', type: 'Call', notes: '', warn: '1 day' })
      loadFollowups()
    }
  }

  function editFollowup(f) {
    const dt = new Date(f.scheduled_at)
    setFollowupForm({
      date: dt.toISOString().split('T')[0],
      time: dt.toTimeString().slice(0, 5),
      type: f.followup_type || 'Call',
      notes: f.notes || '',
      warn: f.warn_before || '1 day'
    })
    setEditingFollowup(f)
    setShowFollowup(true)
  }

  async function deleteFollowup(id) {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('followups').delete().eq('id', id)
    loadFollowups()
  }

  const handleAddProvider = async () => {
    if (!newProvider.last || !newProvider.title || !newProvider.npi) {
      alert('Last name, title, and NPI are required')
      return
    }
    setSaving(true)
    const name = `${newProvider.last}, ${newProvider.title},${newProvider.first}`
    const { error } = await supabase.from('providers').insert({
      clinic_id: clinic.id,
      name,
      title: newProvider.title,
      email: newProvider.email || null,
      phone: newProvider.phone || null,
      npi: newProvider.npi
    })
    setSaving(false)
    if (error) {
      alert('Error adding provider: ' + error.message)
    } else {
      setShowAddProvider(false)
      setNewProvider({ first: '', last: '', title: '', email: '', phone: '', npi: '' })
      if (onRefresh) onRefresh()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn" onClick={() => window.open('https://www.responsedx.net/request-supplies', '_blank')}>Request Supplies</button>
        <button className="btn" onClick={() => window.open('https://www.responsedx.net/copy-of-request-an-account', '_blank')}>Request Pickup</button>
        <button className="btn" onClick={() => {
          const addr = `${clinic.address || ''}, ${clinic.city || ''}, ${clinic.state || ''} ${clinic.zip || ''}`.trim()
          window.open('https://www.google.com/maps/search/catering+near+' + encodeURIComponent(addr), '_blank')
        }}>Find Catering</button>
        <button className="btn secondary">Requisition Form ▾</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'providers', 'activity', 'tests'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? '' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p><strong>Type:</strong> {clinic.clinic_type || 'Clinic'}</p>
              <p><strong>Ordering URL:</strong> {clinic.ordering_url || '—'}</p>
              <p><strong>Requisition:</strong> {clinic.requisition || '—'}</p>
              <p><strong>City:</strong> {clinic.city || '—'}</p>
              <p><strong>Fax:</strong> {clinic.fax || '—'}</p>
              <p><strong>Email:</strong> {clinic.email || '—'}</p>
            </div>
            <div>
              <p><strong>EMR:</strong> {clinic.emr || '—'}</p>
              <p><strong>Supplies URL:</strong> {clinic.supplies_url || '—'}</p>
              <p><strong>Address:</strong> {clinic.address || '—'}, {clinic.city || ''}, {clinic.state || ''} {clinic.zip || ''}</p>
              <p><strong>Phone:</strong> {clinic.phone || '—'}</p>
            </div>
          </div>
          {clinic.office_contact && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f2937' }}>
              <strong>Office Contact:</strong> {clinic.office_contact}
            </div>
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Providers ({clinicProviders.length})</h3>
            <button className="btn" onClick={() => setShowAddProvider(true)}>+ Add Provider</button>
          </div>
          {clinicProviders.map(p => (
            <div key={p.id} onClick={() => onSelectProvider && onSelectProvider(p)} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#14b8a6', fontWeight: 500 }}>{formatProviderName(p)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{p.title || ''} {p.npi ? `• NPI: ${p.npi}` : ''}</div>
              </div>
              <div style={{ color: '#9ca3af', fontSize: 13 }}>{clinicTests.filter(t => t.provider_id === p.id).length} tests</div>
            </div>
          ))}
          {!clinicProviders.length && <p style={{ color: '#6b7280' }}>No providers</p>}
        </div>
      )}

      {tab === 'activity' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Log Activity</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <select value={activityType} onChange={e => setActivityType(e.target.value)} style={{ width: 180 }}>
                <option>Meeting</option>
                <option>In-person visit</option>
                <option>Phone call</option>
                <option>Email</option>
              </select>
              <button className="btn" onClick={logActivity} disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</button>
            </div>
            <textarea
              placeholder="Notes..."
              value={activityNotes}
              onChange={e => setActivityNotes(e.target.value)}
              style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Previous Activity</h3>
            {activities.map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500, color: '#14b8a6' }}>{a.activity_type}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{a.notes}</div>
              </div>
            ))}
            {!activities.length && <p style={{ color: '#6b7280' }}>No activity yet</p>}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Scheduled Follow-ups</h3>
            {followups.map(f => (
              <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => editFollowup(f)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#14b8a6' }}>{f.followup_type} — {new Date(f.scheduled_at).toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>{f.notes || 'No notes'}</div>
                </div>
                <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteFollowup(f.id)}>Delete</button>
              </div>
            ))}
            {!followups.length && <p style={{ color: '#6b7280' }}>No follow-ups scheduled</p>}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests ({clinicTests.length})</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(testCounts).map(([type, count]) => (
              <div key={type} style={{ background: '#1f2937', padding: '8px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{count}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{type}</div>
              </div>
            ))}
          </div>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Accession</th><th>Collected</th><th>Test</th><th>Provider</th></tr></thead>
            <tbody>
              {clinicTests.slice(0, 25).map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{t.collected_at || t.collected || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                  <td>{t.provider_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {clinicTests.length > 25 && <p style={{ color: '#6b7280', marginTop: 12 }}>Showing first 25 of {clinicTests.length}</p>}
        </div>
      )}

      {showFollowup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>{editingFollowup ? 'Edit Follow-up' : 'Schedule Follow-up?'}</h3>
            {!editingFollowup && (
              <p style={{ color: '#9ca3af', marginBottom: 16 }}>Would you like to schedule a follow-up?</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="date" value={followupForm.date} onChange={e => setFollowupForm({...followupForm, date: e.target.value})} />
              <input type="time" value={followupForm.time} onChange={e => setFollowupForm({...followupForm, time: e.target.value})} />
              <select value={followupForm.type} onChange={e => setFollowupForm({...followupForm, type: e.target.value})}>
                <option>Call</option>
                <option>Visit</option>
                <option>Email</option>
                <option>Meeting</option>
              </select>
              <select value={followupForm.warn} onChange={e => setFollowupForm({...followupForm, warn: e.target.value})}>
                <option>15 minutes</option>
                <option>1 hour</option>
                <option>1 day</option>
              </select>
              <textarea placeholder="Notes..." value={followupForm.notes} onChange={e => setFollowupForm({...followupForm, notes: e.target.value})} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={saveFollowup} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn secondary" onClick={() => { setShowFollowup(false); setEditingFollowup(null) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 480 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Account</h3>
            <p style={{ color: '#9ca3af' }}>Edit form coming soon</p>
            <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => setShowEdit(false)}>Close</button>
          </div>
        </div>
      )}

      {showAddProvider && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Add Provider</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="First Name" value={newProvider.first} onChange={e => setNewProvider({...newProvider, first: e.target.value})} />
              <input placeholder="Last Name *" value={newProvider.last} onChange={e => setNewProvider({...newProvider, last: e.target.value})} />
              <input placeholder="Title * (MD, PA, FNP, etc)" value={newProvider.title} onChange={e => setNewProvider({...newProvider, title: e.target.value})} />
              <input placeholder="NPI *" value={newProvider.npi} onChange={e => setNewProvider({...newProvider, npi: e.target.value})} />
              <input placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} />
              <input placeholder="Phone" value={newProvider.phone} onChange={e => setNewProvider({...newProvider, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={handleAddProvider} disabled={saving}>{saving ? 'Saving...' : 'Add Provider'}</button>
              <button className="btn secondary" onClick={() => setShowAddProvider(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}