import React, { useState, useEffect } from "react";
import "../css/Dashboard.css";

function Dashboard() {
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    let baseTime;
    let tickInterval;
    let syncInterval;

    const fetchServerTime = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/time");
        const data = await response.json();

        baseTime = new Date(data.serverTime);
        setServerTime(new Date(baseTime));

        if (tickInterval) clearInterval(tickInterval);

        tickInterval = setInterval(() => {
          baseTime = new Date(baseTime.getTime() + 1000);
          setServerTime(new Date(baseTime));
        }, 1000);

      } catch (err) {
        console.error("Failed to fetch server time");
      }
    };

    fetchServerTime();

    // Re-sync every 60 seconds
    syncInterval = setInterval(fetchServerTime, 60000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, []);

  if (!serverTime) return null;

  const localTime = new Date(serverTime);

  const day = localTime.toLocaleDateString("en-PH", {
    weekday: "long",
  }).toUpperCase();

  const date = localTime.toLocaleDateString("en-PH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const time = localTime.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // recommended for monitoring system
  });

  return (
    <div className="dashboard-wrapper">
      <div className="dashb">
        <header className="campus-header">
          <div className="logo-area">
            <div className="university-emblem">
              <img
                className="seal-placeholder"
                src="../logoplp.gif"
                alt="PLP"
              />
            </div>
            <div className="university-info">
              <h1>PAMANTASAN NG LUNGSOD NG PASIG</h1>
              <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
            </div>
          </div>

          <div className="date-and-time">
            <div className="date-section">
              <span className="day">{day}</span>
              <span className="date">{date}</span>
            </div>
            <div className="time">{time}</div>
          </div>
        </header>
      </div>
    </div>
  );
}

export default Dashboard;
