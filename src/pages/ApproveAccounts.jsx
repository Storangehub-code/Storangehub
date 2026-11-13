import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ApproveAccounts({ clinics = [], onRefresh }) {
  const [reviewing, setReviewing] = useState(null)
  const [providers, setProviders] = useState([])
  const [orderDetails, setOrderDetails] = useState(null)
  const pending = clinics.filter(c => c.stage === 'Pending' && c.is_prospect)

  useEffect(() => { if (reviewing) loadDetails(reviewing) }, [reviewing])

  async function loadDetails(clinic) {
    const { data: provs } = await supabase.from('providers').select('*').eq('clinic_id', clinic.id)
    setProviders(provs || [])
    if (clinic.order_details) {
      try { setOrderDetails(JSON.parse(clinic.order_details)) } catch { setOrderDetails(null) }
    } else setOrderDetails(null)
  }

  async function approve(id) {
    await supabase.from('clinics').update({ stage: 'Approved', is_prospect: false }).eq('id', id)
    setReviewing(null)
    if (onRefresh) onRefresh()
  }

  async function reject(id) {
    if (!confirm('Reject this account?')) return
    await supabase.from('clinics').update({ stage: 'Rejected' }).eq('id', id)
    setReviewing(null)
    if (onRefresh) onRefresh()
  }

  function formatProviderName(p) {
    const parts = (p.name || '').split(',')
    if (parts.length >= 3) return `${parts[2].trim()} ${parts[0].trim()}, ${parts[1].trim()}`
    return p.name || 'Unknown'
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Approve Accounts</h2>
      <div className="card">
        <table>
          <thead><tr><th>Clinic</th><th>Type</th><th>City</th><th>Submitted</th><th></th></tr></thead>
          <tbody>
            {pending.map(c => (
              <tr key={c.id}>
                <td style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => setReviewing(c)}>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td><button className="btn" onClick={() => setReviewing(c)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pending.length && <p style={{ color: '#6b7280', padding: 16 }}>No accounts pending approval.</p>}
      </div>
      {reviewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 560, maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Review: {reviewing.name}</h3>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#14b8a6', marginBottom: 8 }}>Clinic Info</h4>
              <p><strong>Type:</strong> {reviewing.type || '—'}</p>
              <p><strong>Address:</strong> {reviewing.address || '—'}{reviewing.city ? `, ${reviewing.city}` : ''}{reviewing.state ? `, ${reviewing.state}` : ''}</p>
              <p><strong>Phone:</strong> {reviewing.phone || '—'}</p>
              <p><strong>Email:</strong> {reviewing.email || '—'}</p>
              <p><strong>Fax:</strong> {reviewing.fax || '—'}</p>
              <p><strong>EMR:</strong> {reviewing.emr || '—'}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#14b8a6', marginBottom: 8 }}>Providers</h4>
              {providers.length > 0 ? (
                <table style={{ fontSize: 13 }}>
                  <thead><tr><th>Name</th><th>Title</th><th>NPI</th></tr></thead>
                  <tbody>{providers.map(p => <tr key={p.id}><td>{formatProviderName(p)}</td><td>{p.title || '—'}</td><td>{p.npi || '—'}</td></tr>)}</tbody>
                </table>
              ) : <p style={{ color: '#6b7280' }}>No providers listed</p>}
            </div>
            {orderDetails?.supplies && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#14b8a6', marginBottom: 8 }}>Supplies Requested</h4>
                <p><strong>Requisitions:</strong> {orderDetails.supplies.reqs}</p>
                <p><strong>Wound kits:</strong> {orderDetails.supplies.wound}</p>
                <p><strong>UTI kits:</strong> {orderDetails.supplies.uti}</p>
                <p><strong>RPP kits:</strong> {orderDetails.supplies.rpp}</p>
                <p><strong>SynoviFact:</strong> {orderDetails.supplies.synovi}</p>
                <p><strong>Shipping:</strong> {orderDetails.supplies.labels} x{orderDetails.supplies.labelQty}</p>
                <p><strong>Bags:</strong> {orderDetails.supplies.bags}</p>
                <p><strong>First Shipment:</strong> {orderDetails.supplies.firstShipment === 'clinic' ? 'To Clinic' : orderDetails.supplies.firstShipment === 'rep' ? 'To Rep' : 'Other: ' + (orderDetails.supplies.otherAddress || '')}</p>
              </div>
            )}
            {orderDetails?.supplies?.results?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#14b8a6', marginBottom: 8 }}>Results Sent</h4>
                {orderDetails.supplies.results.includes('Fax') && <p><strong>Fax:</strong> {orderDetails.supplies.faxNumber}</p>}
                {orderDetails.supplies.results.includes('Portal') && <p><strong>Portal:</strong> {orderDetails.supplies.portalFirst} {orderDetails.supplies.portalLast} ({orderDetails.supplies.portalEmail})</p>}
                {orderDetails.supplies.results.includes('Encrypted Email') && <p><strong>Encrypted Email:</strong> {orderDetails.supplies.encFirst} {orderDetails.supplies.encLast} ({orderDetails.supplies.encEmail})</p>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => approve(reviewing.id)}>Approve</button>
              <button className="btn secondary" onClick={() => reject(reviewing.id)}>Reject</button>
              <button className="btn secondary" onClick={() => setReviewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}