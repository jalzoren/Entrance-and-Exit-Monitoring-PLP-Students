import { useRef, useEffect } from "react";
import "../css/FaceRecognition.css";

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

  return (
    <div className="dashboard">
      {/* Left side: Camera */}
      <div className="camera-side">
        <video ref={videoRef} autoPlay playsInline className="camera-video" />
        <div className="camera-text">
          Please look at the camera <br></br>and position your face within the on-screen
          frame.
        </div>
      </div>

      {/* Right side: UI */}
      <div className="ui-side">
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
          <h2>pagdating sa PLP</h2>

          <div className="time-status-section">
            <div className="time-date">
              <p className="time">12:00 AM</p>
              <p className="date">30 / 01 / 26 <br>
              </br>Friday</p>
            </div>
          </div>

          <div className="message-box">
            Happy Monday! Let's make it a great week, Jerimiah.
          </div>
        </div>

        <div className="status-box">
          <p>
            <strong>AUTHENTICATION SUCCESSFUL!</strong>
          </p>
          <p>Time: 7:45 AM</p>
          <p>Status: ENTRY - Logged In</p>
          <p>Method: Facial Recognition</p>
        </div>
      </div>
    </div>
  );
}

export default FaceRecognition;
