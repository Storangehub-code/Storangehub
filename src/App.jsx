import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

function App() {
  const isResponseDX = window.location.hostname === 'responsedx.storangehub.com';

  // CRM subdomain — only CRM routes
  if (isResponseDX) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="*" element={<Navigate to="/login" />} />
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;