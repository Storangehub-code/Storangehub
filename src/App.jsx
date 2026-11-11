import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

function App() {
  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com';

  if (isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Main marketing site (storangehub.com)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{padding: '2rem', color: 'white', background: '#0f172a', minHeight: '100vh'}}><h1>Marketing Site</h1><p>Main site home</p></div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
