import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Login.jsx";
import About from "./pages/About.jsx"; // ✅ Import About!
import ForgotPassword from "./pages/ForgotPass.jsx";
import ForgotPassword2 from "./pages/ForgotPass2.jsx"; 
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> 
        <Route path="/forgot-password-2" element={<ForgotPassword2 />} />
      </Routes>
    </Router>
  );
}

export default App;
