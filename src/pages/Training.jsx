import { useState } from 'react'

export default function Training({ role }) {
  const [docs] = useState([
    { id: 1, name: 'Requisition Form', category: 'Forms', description: 'Standard requisition template' },
    { id: 2, name: 'Product Overview', category: 'Training', description: 'Overview of Response DX panels' },
    { id: 3, name: 'Collection Guidelines', category: 'Training', description: 'Sample collection best practices' },
    { id: 4, name: 'CRM Quick Start', category: 'Guides', description: 'How to use this CRM' },
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Training & Documents</h2>
          <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Important docs, requisitions, and guides</p>
        </div>
        {(role === 'manager' || role === 'global_admin') && (
          <button className="btn">+ Upload Document</button>
        )}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td style={{ color: '#14b8a6' }}>{d.name}</td>
                <td><span className="badge">{d.category}</span></td>
                <td style={{ color: '#9ca3af' }}>{d.description}</td>
                <td><button className="btn secondary btn-sm">Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
