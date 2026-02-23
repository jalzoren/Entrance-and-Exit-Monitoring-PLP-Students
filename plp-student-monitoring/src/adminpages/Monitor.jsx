import { useState, useEffect, useRef } from "react";
import "../css/RealTimeMonitor.css";
import '../css/Monitor.css';

const initialLogs = [
  { id: 1, time: "07:59 AM", name: "BITANCOR, JERIMIAH A.",      studentId: "23-00198", action: "ENTRY", method: "FACE",      failed: false },
  { id: 2, time: "07:55 AM", name: "ALPUERTO, LYNN CZYLA M.",    studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 3, time: "08:00 AM", failed: true },
  { id: 4, time: "08:02 AM", name: "CASTILLON, BIANCA RAIN C.",  studentId: "23-00190", action: "ENTRY", method: "FACE",      failed: false },
  { id: 5, time: "08:10 AM", name: "FLAVIER, LAURENCE JAMES L.", studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 6, time: "08:11 AM", name: "ONRUBIA, NEIL ADRIAN N.",    studentId: "23-00170", action: "ENTRY", method: "MANUAL ID", failed: false },
  { id: 7, time: "08:12 AM", failed: true },
];

function LogEntry({ log, animDelay }) {
  return (
    <>
      {log.failed ? (
        <div className="rtm-log-entry failed" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span> — Failed Authentication Attempt
        </div>
      ) : (
        <div className="rtm-log-entry success" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time}]</span>{" "}
          <strong>{log.name}</strong> ({log.studentId}) — {log.action}{" "}
          <span className="rtm-log-method">via {log.method}</span>
        </div>
      )}
      <div className="rtm-log-divider" />
    </>
  );
}

export default function Monitor() {
  const [logs, setLogs]           = useState(initialLogs);
  const [count, setCount]         = useState(1000);
  const [activeBtn, setActiveBtn] = useState(null);
  const logRef                    = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (entry) => {
    setLogs((prev) => [...prev, { id: Date.now(), ...entry }]);
  };

  const handleEntrance = () => {
    setActiveBtn("entrance");
    addLog({
      time:      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      name:      "NEW STUDENT",
      studentId: "23-00" + Math.floor(Math.random() * 900 + 100),
      action:    "ENTRY",
      method:    "MANUAL ID",
      failed:    false,
    });
    setCount((c) => c + 1);
    setTimeout(() => setActiveBtn(null), 300);
  };

  const handleExit = () => {
    setActiveBtn("exit");
    addLog({
      time:      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      name:      "STUDENT",
      studentId: "23-00" + Math.floor(Math.random() * 900 + 100),
      action:    "EXIT",
      method:    "FACE",
      failed:    false,
    });
    setCount((c) => Math.max(0, c - 1));
    setTimeout(() => setActiveBtn(null), 300);
  };

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>
      <hr className="header-divider" />

      {/* ── Monitor content ── */}
      <div className="rtm-wrapper">
        <div className="rtm-card">

          {/* Student count only */}
          <div className="rtm-subheader">
            <div className="rtm-student-count">STUDENTS: {count.toLocaleString()}</div>
          </div>

          {/* Avatar panel (left) + log panel (right) */}
          <div className="rtm-body">

            <div className="rtm-left-panel">
              <div className="rtm-btn-row">
                <button
                  className={`rtm-btn ${activeBtn === "entrance" ? "active" : ""}`}
                  onClick={handleEntrance}
                >
                  Entrance
                </button>
                <button
                  className={`rtm-btn ${activeBtn === "exit" ? "active" : ""}`}
                  onClick={handleExit}
                >
                  Exit
                </button>
              </div>

              <div className="rtm-avatar-box">
                <div className="rtm-corner tl" />
                <div className="rtm-corner tr" />
                <div className="rtm-corner bl" />
                <div className="rtm-corner br" />
                <div className="rtm-scan-line" />
                <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="38" r="24" stroke="#0d3321" strokeWidth="3" />
                  <path
                    d="M10 115c0-22 18-40 40-40s40 18 40 40"
                    stroke="#0d3321"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="rtm-status-text">Awaiting scan...</div>
            </div>

            <div className="rtm-log-panel" ref={logRef}>
              {logs.map((log, i) => (
                <LogEntry key={log.id} log={log} animDelay={i < 7 ? i * 0.06 : 0} />
              ))}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}