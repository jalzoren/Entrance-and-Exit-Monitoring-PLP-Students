import { useRef, useEffect, useState } from "react";
import "../css/FaceRecognition.css";
import { Link } from "react-router-dom";

function FaceRecognition() {
  const videoRef = useRef(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
  }, []);

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const manilaTime = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(now);

      const manilaDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(now);

      const manilaDay = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "long",
      }).format(now);

      setTime(manilaTime);
      setDate(manilaDate);
      setDay(manilaDay);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      {/* Left side: Camera */}
      <div className="camera-side">
        <video ref={videoRef} autoPlay playsInline className="camera-video" />
        <div className="camera-text">
          Please look at the camera <br></br>and position your face within the
          on-screen frame.
        </div>
      </div>

      {/* Right side: UI */}
      <div className="ui-side">
          <Link to="/" className="back-link">
          &larr; Back to Login
        </Link>
        <div className="school-info">
          
          <img src="/logoplp.gif" alt="School Logo" className="school-logo" />
          <div className="school-text">
            <h1>PAMANTASAN NG LUNGSOD NG PASIG</h1>
            <hr />
            <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
          </div>
        </div>
      

        <div className="mabuhay-section">
          <h2>Mabuhay, Maligayang</h2>
          <h2>pagdating sa PLP!</h2>

          <div className="time-status-section">
            <div className="time-date">
              <p className="time">{time}</p>
              <p className="date">
                {date}
                <br />
                {day}
              </p>
            </div>
          </div>

          <div className="message-box">
            Happy Monday! Let's make it a great week, Jerimiah.
          </div>
        </div>

        <div className="status-box">
          <h2>
            <strong>AUTHENTICATION SUCCESSFUL!</strong>
          </h2>
          <p>
            Time: <span>7:45 AM </span>{" "}
          </p>
          <p>
            Status:<span> ENTRY - Logged In </span>
          </p>
          <p>
            Method: <span>Facial Recognition</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default FaceRecognition;
