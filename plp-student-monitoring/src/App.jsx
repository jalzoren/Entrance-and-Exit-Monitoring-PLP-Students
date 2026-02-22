// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import DashboardLayout from './components/DashboardLayout'; // contains Sidebar

// Pages (create these or use placeholders)  
/* import Monitor from './pages/Monitor';
import Records from './pages/Records';
import Students from './pages/Students'; */

// Optional: Login page without layout
import Login from './pages/Login';
import Dashboard from './adminpages/Dashboard';
import Monitor from './adminpages/Monitor';
import Records from './adminpages/Records';
import Students from './adminpages/Students';
import Analytics from './adminpages/Analytics';


import Forgot from './pages/ForgotPass';
import Forgot2 from './pages/ForgotPass2';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />
        <Route path="/forgotpass" element={<Forgot />} />
        <Route path="/forgotpass2" element={<Forgot2 />} />

        {/* Protected routes with sidebar */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/records" element={<Records />} />
          <Route path="/students" element={<Students />} />
          <Route path="/analytics" element={<Analytics />} />
       {/*}   <Route path="/monitor" element={<Monitor />} />
          <Route path="/records" element={<Records />} />
          <Route path="/students" element={<Students />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Optional: redirect or home */}
          <Route path="/" element={<Dashboard />} />
        </Route>

        {/* Optional 404 */}
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
