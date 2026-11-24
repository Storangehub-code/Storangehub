import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { notify, getHigherLevelTargets, sendEmail, GLOBAL_EMAIL } from '../lib/notify'

function formatProviderName(p) {
  const raw = (p.name || '').trim()
  if (!raw || raw.toLowerCase() === 'unknown') return 'Unknown'
  const parts = raw.split(',').map(s => s.trim()).filter(s => s && s !== '-' && !/^[-–—]+$/.test(s))
  if (parts.length >= 3) return `${parts[0]}, ${parts[2]}, ${parts[1]}`
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  if (parts.length === 1) return parts[0]
  return 'Unknown'
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

export default function ClinicDetail({ clinic: clinicProp, providers = [], tests = [], onBack, onSelectProvider, onRefresh }) {
  const [clinic, setClinic] = useState(clinicProp)
  useEffect(() => { setClinic(clinicProp) }, [clinicProp])
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [reqItems, setReqItems] = useState([])   // {type, file, existingUrl, name}
  const [showReqMenu, setShowReqMenu] = useState(false)
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
      // Notify rep + manager if this was logged by someone else
      const targets = await getHigherLevelTargets(clinic)
      if (targets.length) {
        await notify(targets, `New activity (${activityType}) on ${clinic.name}`, 'activity', clinic.id)
      }
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

  function openEdit() {
    setEditForm({
      name: clinic.name || '',
      type: clinic.type || clinic.clinic_type || '',
      address: clinic.address || '',
      city: clinic.city || '',
      state: clinic.state || '',
      zip: clinic.zip || '',
      phone: clinic.phone || '',
      fax: clinic.fax || '',
      email: clinic.email || '',
      emr: clinic.emr || '',
      office_contact: clinic.office_contact || '',
      ordering_url: clinic.ordering_url || '',
      supplies_url: clinic.supplies_url || ''
    })
    // load existing requisitions (json array or legacy single url)
    let existing = []
    try {
      if (clinic.requisitions) existing = typeof clinic.requisitions === 'string' ? JSON.parse(clinic.requisitions) : clinic.requisitions
    } catch {}
    if (!existing.length && clinic.requisition) existing = [{ type: 'General', url: clinic.requisition, name: 'Requisition' }]
    setReqItems(existing.map(r => ({ type: r.type || 'General', file: null, existingUrl: r.url || '', name: r.name || '' })))
    setShowEdit(true)
  }

  async function saveClinicEdit() {
    if (!editForm.name) return alert('Name is required')
    setSaving(true)
    // Upload any new requisition files and build the array
    const savedReqs = []
    for (const item of reqItems) {
      if (!item.type) continue
      let url = item.existingUrl || ''
      if (item.file) {
        const path = `requisitions/${clinic.id}-${Date.now()}-${item.file.name}`
        const { error: upErr } = await supabase.storage.from('docs').upload(path, item.file, { upsert: true })
        if (upErr) { setSaving(false); return alert('Upload failed: ' + upErr.message) }
        const { data: urlData } = supabase.storage.from('docs').getPublicUrl(path)
        url = urlData.publicUrl
      }
      if (url) savedReqs.push({ type: item.type, url, name: item.name || item.file?.name || item.type })
    }
    const { requisition: _r, requisitions: _rs, ...rest } = editForm
    const payload = { ...rest, requisitions: savedReqs }
    const { error } = await supabase.from('clinics').update(payload).eq('id', clinic.id)
    setSaving(false)
    if (error) return alert(error.message)
    setClinic(prev => ({ ...prev, ...payload }))
    setShowEdit(false)
    setReqItems([])
    if (onRefresh) onRefresh()
    // Notify on edit
    const targets = await getHigherLevelTargets(clinic)
    if (targets.length) {
      await notify(targets, `Account updated: ${clinic.name}`, 'account_edit', clinic.id)
    }
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
        <button className="btn" onClick={openEdit}>Edit</button>
        <button className="btn" onClick={async () => {
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'global_admin')
          if (admins) await notify(admins.map(a => a.id), `Supply order requested for ${clinic.name}`, 'supply_order', clinic.id)
          const url = clinic.supplies_url || 'https://www.responsedx.net/request-supplies'
          window.open(url, '_blank')
        }}>Request Supplies</button>
        <button className="btn" onClick={async () => {
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'global_admin')
          if (admins) await notify(admins.map(a => a.id), `Pickup requested for ${clinic.name}`, 'pickup', clinic.id)
          const url = clinic.ordering_url || 'https://www.responsedx.net/copy-of-request-an-account'
          window.open(url, '_blank')
        }}>Request Pickup</button>
        <button className="btn" onClick={() => {
          const addr = `${clinic.address || ''}, ${clinic.city || ''}, ${clinic.state || ''} ${clinic.zip || ''}`.trim()
          window.open('https://www.google.com/maps/search/catering+near+' + encodeURIComponent(addr), '_blank')
        }}>Find Catering</button>
        {(() => {
  let reqs = []
  try { reqs = typeof clinic.requisitions === 'string' ? JSON.parse(clinic.requisitions) : (clinic.requisitions || []) } catch {}
  if (!reqs.length && clinic.requisition) reqs = [{ type: 'General', url: clinic.requisition }]
  if (!reqs.length) return null
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn secondary" onClick={() => setShowReqMenu(v => !v)}>
        Requisition Form ▾
      </button>
      {showReqMenu && (
        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#1f2937', border: '1px solid #374151', borderRadius: 6, minWidth: 180, zIndex: 10, marginTop: 4 }}>
          {reqs.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noreferrer"
              style={{ display: 'block', padding: '8px 12px', color: '#e5e7eb', textDecoration: 'none', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = '#374151'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => setShowReqMenu(false)}>
              {r.type || 'Requisition'}
            </a>
          ))}
        </div>
      )}
    </div>
  )
})()}
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
              <p><strong>Type:</strong> {clinic.type || clinic.clinic_type || 'Clinic'}</p>
              <p><strong>Pickup URL:</strong> {clinic.ordering_url ? 'Custom URL uploaded' : '—'}</p>
              <div>
                <strong>Requisitions:</strong>
                {(() => {
                  let list = []
                  try { list = typeof clinic.requisitions === 'string' ? JSON.parse(clinic.requisitions) : (clinic.requisitions || []) } catch {}
                  if (!list.length && clinic.requisition) list = [{ type: 'General', url: clinic.requisition }]
                  return list.length ? (
                    <div style={{ marginTop: 4 }}>
                      {list.map((r, i) => (
                        <div key={i} style={{ fontSize: 13 }}>
                          {r.type}: <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#14b8a6' }}>View PDF</a>
                        </div>
                      ))}
                    </div>
                  ) : ' —'
                })()}
              </div>
              <p><strong>City:</strong> {clinic.city || '—'}</p>
              <p><strong>Fax:</strong> {clinic.fax || '—'}</p>
              <p><strong>Email:</strong> {clinic.email || '—'}</p>
            </div>
            <div>
              <p><strong>EMR:</strong> {clinic.emr || '—'}</p>
              <p><strong>Supplies URL:</strong> {clinic.supplies_url ? 'Custom URL uploaded' : '—'}</p>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={calendarLinks(f, clinic.name).google} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Google</a>
                  <a href={calendarLinks(f, clinic.name).outlook} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Outlook</a>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteFollowup(f.id)}>Delete</button>
                </div>
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
            <thead><tr><th>Accession</th><th>Collected</th><th>Received</th><th>Released</th><th>Test</th><th>Provider</th></tr></thead>
            <tbody>
              {[...clinicTests].sort((a, b) => (b.received_at || b.received || b.collected_at || b.collected || '').localeCompare(a.received_at || a.received || a.collected_at || a.collected || '')).slice(0, 25).map(t => {
                const prov = clinicProviders.find(p => p.id === t.provider_id)
                const provName = prov ? formatProviderName(prov) : (t.provider_name || '—')
                return (
                  <tr key={t.id}>
                    <td>{t.accession || '—'}</td>
                    <td>{formatDate(t.collected_at || t.collected) || '—'}</td>
                    <td>{formatDate(t.received_at || t.received) || '—'}</td>
                    <td>{formatDate(t.released_at || t.released || t.finalized_at || t.finalized) || '—'}</td>
                    <td>{t.test_type || '—'}</td>
                    <td>{provName}</td>
                  </tr>
                )
              })}
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
          <div className="card" style={{ width: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Edit Account</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}><label>Name *</label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
              <div><label>Type</label><input value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} /></div>
              <div><label>EMR</label><input value={editForm.emr} onChange={e => setEditForm({...editForm, emr: e.target.value})} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>Address</label><input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></div>
              <div><label>City</label><input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} /></div>
              <div><label>State</label><input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} /></div>
              <div><label>Zip</label><input value={editForm.zip} onChange={e => setEditForm({...editForm, zip: e.target.value})} /></div>
              <div><label>Phone</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
              <div><label>Fax</label><input value={editForm.fax} onChange={e => setEditForm({...editForm, fax: e.target.value})} /></div>
              <div><label>Email</label><input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>Office Contact</label><input value={editForm.office_contact} onChange={e => setEditForm({...editForm, office_contact: e.target.value})} /></div>
              <div><label>Pickup URL</label><input value={editForm.ordering_url} onChange={e => setEditForm({...editForm, ordering_url: e.target.value})} /></div>
              <div><label>Supplies URL</label><input value={editForm.supplies_url} onChange={e => setEditForm({...editForm, supplies_url: e.target.value})} /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Requisitions (PDF)</label>
                {reqItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={item.type} onChange={e => { const next = [...reqItems]; next[idx].type = e.target.value; setReqItems(next) }} style={{ flex: '0 0 140px' }}>
                      <option>Urine</option>
                      <option>SynoviFact</option>
                      <option>Wound</option>
                      <option>RPP</option>
                      <option>UTI</option>
                      <option>Culture</option>
                      <option>General</option>
                    </select>
                    <input type="file" accept="application/pdf" onChange={e => { const next = [...reqItems]; next[idx].file = e.target.files?.[0] || null; setReqItems(next) }} style={{ flex: 1 }} />
                    {item.existingUrl && !item.file && <a href={item.existingUrl} target="_blank" rel="noreferrer" style={{ color: '#14b8a6', fontSize: 12 }}>Current</a>}
                    <button type="button" className="btn secondary" style={{ padding: '4px 8px' }} onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn secondary" style={{ fontSize: 13 }} onClick={() => setReqItems([...reqItems, { type: 'Urine', file: null, existingUrl: '', name: '' }])}>+ Add Requisition</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={saveClinicEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
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