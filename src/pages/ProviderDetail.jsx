import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatName(p) {
  const parts = (p.name || '').split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return p.name || 'Unknown'
}

export default function ProviderDetail({ provider, tests = [], clinics = [], onBack, onSelectClinic }) {
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)

  const [activities, setActivities] = useState([])
  const [activityType, setActivityType] = useState('Meeting')
  const [activityNotes, setActivityNotes] = useState('')
  const [showFollowup, setShowFollowup] = useState(false)
  const [followups, setFollowups] = useState([])
  const [editingFollowup, setEditingFollowup] = useState(null)
  const [followupForm, setFollowupForm] = useState({ date: '', time: '', type: 'Call', notes: '', warn: '1 day' })

  const clinic = clinics.find(c => c.id === provider.clinic_id)
  const providerTests = tests.filter(t => t.provider_id === provider.id)
  const testCounts = {}
  providerTests.forEach(t => { testCounts[t.test_type || 'Unknown'] = (testCounts[t.test_type || 'Unknown'] || 0) + 1 })

  useEffect(() => {
    loadActivities()
    loadFollowups()
  }, [provider.id])

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*').eq('provider_id', provider.id).order('created_at', { ascending: false })
    setActivities(data || [])
  }

  async function loadFollowups() {
    const { data } = await supabase.from('followups').select('*').eq('provider_id', provider.id).order('scheduled_at', { ascending: true })
    setFollowups(data || [])
  }

  async function logActivity() {
    if (!activityNotes.trim()) {
      alert('Please enter notes')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('activities').insert({
      provider_id: provider.id,
      clinic_id: provider.clinic_id,
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
      provider_id: provider.id,
      clinic_id: provider.clinic_id,
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

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn">Edit</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'tests', 'activity'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? '' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>{formatName(provider)}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p><strong>Title:</strong> {provider.title || '—'}</p>
              <p><strong>NPI:</strong> {provider.npi || '—'}</p>
              <p><strong>Email:</strong> {provider.email || '—'}</p>
              <p><strong>Phone:</strong> {provider.phone || '—'}</p>
            </div>
            <div>
              <p><strong>Clinic:</strong> <span 
                style={{ color: '#14b8a6', cursor: 'pointer' }} 
                onClick={() => onSelectClinic && clinic && onSelectClinic(clinic)}
              >{clinic?.name || '—'}</span></p>
              <p><strong>Total Tests:</strong> {providerTests.length}</p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(testCounts).map(([type, count]) => (
              <div key={type} style={{ background: '#1f2937', padding: '8px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{count}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tests ({providerTests.length})</h3>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Accession</th><th>Collected</th><th>Test</th></tr></thead>
            <tbody>
              {providerTests.slice(0, 25).map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{t.collected_at || t.collected || '—'}</td>
                  <td>{t.test_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {providerTests.length > 25 && <p style={{ color: '#6b7280', marginTop: 12 }}>Showing first 25</p>}
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
              style={{ width: '100%', minHeight: 80 }}
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
    </div>
  )
}