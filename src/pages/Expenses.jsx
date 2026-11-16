import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Expenses({ expenses = [], clinics = [], providers = [], onRefresh, role, session }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    expense_type: 'Meals',
    clinic_id: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  async function addExpense() {
    if (!form.amount) return alert('Amount is required')
    const { error } = await supabase.from('expenses').insert({
      amount: parseFloat(form.amount),
      expense_type: form.expense_type,
      clinic_id: form.clinic_id || null,
      notes: form.notes,
      date: form.date,
      user_id: session?.user?.id,
      status: 'pending'
    })
    if (error) return alert(error.message)
    setShowAdd(false)
    setForm({ amount: '', expense_type: 'Meals', clinic_id: '', notes: '', date: new Date().toISOString().split('T')[0] })
    if (onRefresh) onRefresh()
  }

  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Expenses</h2>
          <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Total: ${total.toFixed(2)}</p>
        </div>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Expense</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Clinic</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td>{e.date || '—'}</td>
                <td>{e.expense_type || '—'}</td>
                <td>{clinics.find(c => c.id === e.clinic_id)?.name || '—'}</td>
                <td>${parseFloat(e.amount || 0).toFixed(2)}</td>
                <td><span className="badge">{e.status || 'pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!expenses.length && <p style={{ color: '#6b7280', padding: 16 }}>No expenses yet.</p>}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#111827', padding: 24, borderRadius: 12, width: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Expense</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Type</label>
              <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })} style={{ width: '100%' }}>
                <option>Meals</option>
                <option>Auto Expense</option>
                <option>Lodging</option>
                <option>Travel</option>
                <option>Office Supplies</option>
                <option>Marketing</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Clinic (optional)</label>
              <select value={form.clinic_id} onChange={e => setForm({ ...form, clinic_id: e.target.value })} style={{ width: '100%' }}>
                <option value="">None</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9ca3af' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn" onClick={addExpense}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
