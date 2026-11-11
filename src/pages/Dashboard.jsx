import { useState } from 'react';

export default function Dashboard() {
  const [page, setPage] = useState('dashboard');
  const [role] = useState('rep'); // change to 'manager' or 'global_admin' to test levels

  // Sample data
  const clinics = [
    { id: 1, name: 'Test Clinic 1', type: 'Orthopedic', city: 'Orlando', active: true, tests: 42 },
    { id: 2, name: 'WoundCentrics Columbus', type: 'Wound Care', city: 'Columbus', active: true, tests: 28 },
    { id: 3, name: 'Baylor Scott', type: 'Multi', city: 'Dallas', active: false, tests: 5 },
  ];

  const providers = [
    { id: 1, name: 'Williams, Gerald, MD', clinic: 'Test Clinic 1', tests: 22 },
    { id: 2, name: 'Smith, Jane, DO', clinic: 'WoundCentrics Columbus', tests: 18 },
  ];

  const recentTests = [
    { accession: 'A1001', collected: '2026-11-10', finalized: '2026-11-11', test: 'SynoviFact', clinic: 'Test Clinic 1' },
    { accession: 'A1002', collected: '2026-11-09', finalized: '2026-11-10', test: 'RPP', clinic: 'WoundCentrics Columbus' },
  ];

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'providers', label: 'Surgeons / Providers' },
    { id: 'reports', label: 'Reports' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'training', label: 'Training' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#1e293b', padding: '1.5rem 1rem', borderRight: '1px solid #334155' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', color: '#38bdf8' }}>Response DX</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
          {role === 'global_admin' ? 'Global Admin' : role === 'manager' ? 'Manager' : 'Rep'}
        </div>
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.75rem 1rem',
              marginBottom: '0.25rem',
              background: page === item.id ? '#334155' : 'transparent',
              color: page === item.id ? '#fff' : '#cbd5e1',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {page === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Accounts</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>2</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Accounts Needing Attention</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>1</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tests This Month</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>75</div>
              </div>
              <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Est. Profit</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>$9,375</div>
              </div>
            </div>

            <h2 style={{ marginBottom: '1rem' }}>Recent Testing Activity</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#334155' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Accession</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Collected</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Finalized</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Test</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Clinic</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map(t => (
                  <tr key={t.accession} style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem' }}>{t.accession}</td>
                    <td style={{ padding: '0.75rem' }}>{t.collected}</td>
                    <td style={{ padding: '0.75rem' }}>{t.finalized}</td>
                    <td style={{ padding: '0.75rem' }}>{t.test}</td>
                    <td style={{ padding: '0.75rem' }}>{t.clinic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page === 'accounts' && (
          <div>
            <h1>Accounts</h1>
            <button style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', margin: '1rem 0', cursor: 'pointer' }}>+ Add Account</button>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {clinics.map(c => (
                <div key={c.id} style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: c.active ? '4px solid #22c55e' : '4px solid #f59e0b' }}>
                  <strong>{c.name}</strong>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{c.type} · {c.city} · {c.tests} tests</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'providers' && (
          <div>
            <h1>Surgeons / Providers</h1>
            {providers.map(p => (
              <div key={p.id} style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                {p.name} — {p.clinic} ({p.tests} tests)
              </div>
            ))}
          </div>
        )}

        {page === 'reports' && <div><h1>Reports</h1><p>Monthly volume, inactive accounts, and more go here.</p></div>}
        {page === 'followups' && <div><h1>Follow-ups</h1><p>Calendar and scheduled follow-ups.</p></div>}
        {page === 'expenses' && <div><h1>Expenses</h1><p>Upload receipts, track status, approve flow.</p></div>}
        {page === 'training' && <div><h1>Training</h1><p>Docs, requisitions, and team resources.</p></div>}
      </main>
    </div>
  );
}
