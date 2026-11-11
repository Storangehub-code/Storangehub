import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard'; // ← change this path if your real dashboard file is named something else

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