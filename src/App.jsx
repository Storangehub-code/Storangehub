import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com';

  if (isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          {/* On the CRM subdomain, send everyone to the dashboard */}
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div style={{padding: '2rem'}}><h1>CRM Dashboard</h1><p>Your real dashboard goes here</p></div>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Main marketing site
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{padding: '2rem'}}><h1>Marketing Site</h1><p>Main site home</p></div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;