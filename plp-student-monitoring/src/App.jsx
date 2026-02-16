import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Login.jsx";
import About from "./pages/About.jsx"; // ✅ Import About!
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
