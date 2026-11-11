import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com';

  if (isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div style={{padding: '2rem'}}><h1>CRM Login</h1><p>Login page will go here</p></div>} />
          <Route path="/dashboard" element={<div style={{padding: '2rem'}}><h1>CRM Dashboard</h1><p>Dashboard will go here</p></div>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    );
  }

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