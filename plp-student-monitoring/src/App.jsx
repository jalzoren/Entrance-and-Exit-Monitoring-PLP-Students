// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';

// Pages (create these or use placeholders)
import Dashboard from './pages/Dashboard';
/* import Monitor from './pages/Monitor';
import Records from './pages/Records';
import Students from './pages/Students';
import Analytics from './pages/Analytics'; */

// Optional: Login page without layout
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (no sidebar) */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with sidebar */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
       {/*}   <Route path="/monitor" element={<Monitor />} />
          <Route path="/records" element={<Records />} />
          <Route path="/students" element={<Students />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Optional: redirect or home */}
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;