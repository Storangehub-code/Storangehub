import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatName(p) {
  const parts = (p.name || '').split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return p.name || 'Unknown'
}

function calendarLinks(f, clinicName) {
  const start = new Date(f.scheduled_at)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const title = encodeURIComponent(`${f.followup_type || 'Follow-up'} — ${clinicName || 'Clinic'}`)
  const details = encodeURIComponent(f.notes || '')
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}`
  return { google, outlook }
}

function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('T')[0].split('-')
  return `${m}-${day}-${y}`
}

export default function ProviderDetail({ provider, tests = [], clinics = [], onBack, onSelectClinic }) {
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})

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

  function openEdit() {
    const parts = (provider.name || '').split(',').map(s => s.trim())
    setEditForm({
      first: parts.length >= 3 ? parts[2] : (parts[1] || ''),
      last: parts[0] || '',
      title: provider.title || (parts.length >= 3 ? parts[1] : ''),
      npi: provider.npi || '',
      email: provider.email || '',
      phone: provider.phone || ''
    })
    setShowEdit(true)
  }

  async function saveProviderEdit() {
    if (!editForm.last || !editForm.title || !editForm.npi) return alert('Last name, title, and NPI are required')
    setSaving(true)
    const name = `${editForm.last}, ${editForm.title},${editForm.first}`
    const { error } = await supabase.from('providers').update({
      name,
      title: editForm.title,
      npi: editForm.npi,
      email: editForm.email || null,
      phone: editForm.phone || null
    }).eq('id', provider.id)
    setSaving(false)
    if (error) return alert(error.message)
    setShowEdit(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <button className="btn" onClick={openEdit}>Edit</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'tests', 'activity', 'performance'].map(t => (
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
              {[...providerTests].sort((a, b) => (b.collected_at || b.collected || '').localeCompare(a.collected_at || a.collected || '')).slice(0, 25).map(t => (
                <tr key={t.id}>
                  <td>{t.accession || '—'}</td>
                  <td>{formatDate(t.collected_at || t.collected) || '—'}</td>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={calendarLinks(f, clinic?.name).google} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Google</a>
                  <a href={calendarLinks(f, clinic?.name).outlook} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Outlook</a>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteFollowup(f.id)}>Delete</button>
                </div>
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


      {tab === 'performance' && (() => {
        const now = new Date()
        const getDate = t => t.collected_at || t.collected || t.received_at || t.received || ''
        const dated = providerTests.filter(t => getDate(t)).map(t => ({ ...t, d: new Date(getDate(t).split('T')[0]) }))

        const weeks = []
        for (let i = 7; i >= 0; i--) {
          const start = new Date(now)
          start.setDate(now.getDate() - now.getDay() - i * 7)
          start.setHours(0,0,0,0)
          const end = new Date(start)
          end.setDate(start.getDate() + 7)
          const count = dated.filter(t => t.d >= start && t.d < end).length
          const label = i === 0 ? 'This wk' : i === 1 ? 'Last wk' : `${i} wks ago`
          weeks.push({ label, count })
        }

        const months = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
          const count = dated.filter(t => t.d >= d && t.d < next).length
          months.push({ label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), count })
        }

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const soFar = dated.filter(t => t.d >= thisMonthStart).length
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const dayOfMonth = now.getDate()
        const predicted = dayOfMonth > 0 ? Math.round(soFar / dayOfMonth * daysInMonth) : soFar
        const remaining = daysInMonth - dayOfMonth

        const maxW = Math.max(...weeks.map(w => w.count), 1)
        const maxM = Math.max(...months.map(m => m.count), 1)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Week over Week</h3>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>Sample volume over the last 8 weeks</div>
              <svg viewBox="0 0 600 160" style={{ width: '100%', height: 160 }}>
                {weeks.map((w, i) => {
                  const x = 30 + i * 70
                  const y = 140 - (w.count / maxW) * 110
                  return (
                    <g key={i}>
                      {i > 0 && <line x1={30 + (i-1)*70} y1={140 - (weeks[i-1].count / maxW)*110} x2={x} y2={y} stroke="#14b8a6" strokeWidth="2" />}
                      <circle cx={x} cy={y} r="4" fill="#14b8a6" />
                      <text x={x} y={y - 8} textAnchor="middle" fill="#e5e7eb" fontSize="11">{w.count}</text>
                      <text x={x} y="155" textAnchor="middle" fill="#9ca3af" fontSize="9">{w.label}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
              <div className="card">
                <h3 style={{ marginBottom: 8 }}>Month over Month</h3>
                <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>Sample volume over the last 6 months</div>
                <svg viewBox="0 0 500 160" style={{ width: '100%', height: 160 }}>
                  {months.map((m, i) => {
                    const x = 40 + i * 75
                    const h = (m.count / maxM) * 110
                    const y = 130 - h
                    const colors = ['#14b8a6','#3b82f6','#8b5cf6','#14b8a6','#3b82f6','#8b5cf6']
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width="40" height={h} fill={colors[i]} rx="3" />
                        <text x={x+20} y={y - 6} textAnchor="middle" fill="#e5e7eb" fontSize="11">{m.count}</text>
                        <text x={x+20} y="150" textAnchor="middle" fill="#9ca3af" fontSize="9">{m.label}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>Current Month Prediction</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: '#14b8a6' }}>{predicted}</div>
                <div style={{ color: '#9ca3af', fontSize: 14 }}>samples</div>
                <div style={{ marginTop: 12, color: '#d1d5db', fontSize: 13 }}>
                  Based on {soFar} so far this month,<br/>{remaining} days remaining
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Provider</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label>First</label><input value={editForm.first} onChange={e => setEditForm({...editForm, first: e.target.value})} /></div>
              <div><label>Last *</label><input value={editForm.last} onChange={e => setEditForm({...editForm, last: e.target.value})} /></div>
              <div><label>Title *</label><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></div>
              <div><label>NPI *</label><input value={editForm.npi} onChange={e => setEditForm({...editForm, npi: e.target.value})} /></div>
              <div><label>Email</label><input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
              <div><label>Phone</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={saveProviderEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}