import { useState } from "react";
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  // This runs in the Electron desktop app
  const handleClick = () => {
    alert("Electron + React is working! 🎉");
    setCount(count + 1);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Electron + React Test</h1>
      <p>Button clicked {count} times</p>
      <button onClick={handleClick} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Click Me
      </button>
    </div>
  );
}

export default App;
