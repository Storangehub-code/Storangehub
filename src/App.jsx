import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient'; // adjust path if needed

// Marketing pages
import MarketingHome from './pages/MarketingHome';
import About from './pages/About';
import Products from './pages/Products';
import CustomerStories from './pages/CustomerStories';

// CRM pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Providers from './pages/Providers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import FollowUps from './pages/FollowUps';
import Prospects from './pages/Prospects';
// add any other CRM pages you have

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  // CRM subdomain — only CRM routes
  if (isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/accounts" element={session ? <Accounts /> : <Navigate to="/login" />} />
          <Route path="/providers" element={session ? <Providers /> : <Navigate to="/login" />} />
          <Route path="/expenses" element={session ? <Expenses /> : <Navigate to="/login" />} />
          <Route path="/reports" element={session ? <Reports /> : <Navigate to="/login" />} />
          <Route path="/followups" element={session ? <FollowUps /> : <Navigate to="/login" />} />
          <Route path="/prospects" element={session ? <Prospects /> : <Navigate to="/login" />} />
          {/* add more protected CRM routes here */}
          <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Main marketing site
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stories" element={<CustomerStories />} />
        <Route path="/login" element={<Login />} />
        {/* add any other marketing routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;