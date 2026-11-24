export default function RepPerformance({ rep, clinics = [], tests = [], onBack }) {
  const now = new Date()
  const repClinics = clinics.filter(c => c.rep_id === rep.id)
  const repClinicIds = new Set(repClinics.map(c => c.id))
  const repTests = tests.filter(t => repClinicIds.has(t.clinic_id))

  const getDate = t => t.collected_at || t.collected || t.received_at || t.received || ''
  const dated = repTests.filter(t => getDate(t)).map(t => ({ ...t, d: new Date(getDate(t).split('T')[0]) }))

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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn secondary" onClick={onBack}>← Back</button>
        <h2 style={{ margin: 0 }}>{rep.full_name} — Performance</h2>
      </div>
      <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
        {repClinics.length} accounts · {repTests.length} total tests
      </div>

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
    </div>
  )
}
