import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ApproveAccounts({ clinics = [], onRefresh }) {
  const pending = clinics.filter(c => c.status === 'pending' || c.needs_approval)

  async function approve(id) {
    await supabase.from('clinics').update({ 
      status: 'approved', 
      needs_approval: false,
      is_prospect: false 
    }).eq('id', id)
    if (onRefresh) onRefresh()
  }

  async function reject(id) {
    if (!confirm('Reject this account?')) return
    await supabase.from('clinics').update({ status: 'rejected' }).eq('id', id)
    if (onRefresh) onRefresh()
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Approve Accounts</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Type</th>
              <th>City</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.type || '—'}</td>
                <td>{c.city || '—'}</td>
                <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td>
                  <button className="btn" style={{ marginRight: 8 }} onClick={() => approve(c.id)}>Approve</button>
                  <button className="btn secondary" onClick={() => reject(c.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pending.length && <p style={{ color: '#6b7280', padding: 16 }}>No accounts pending approval.</p>}
      </div>
    </div>
  )
}
