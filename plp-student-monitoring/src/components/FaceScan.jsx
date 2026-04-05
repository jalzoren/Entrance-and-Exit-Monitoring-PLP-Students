// FaceScan.jsx
import '../componentcss/FaceScan.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { showEntryExitAlert } from '../components/ShowEntryExitAlerts.jsx';
import { LuCircleCheckBig } from "react-icons/lu";

function FaceScan({ mode = 'ENTRY' }) {
  const navigate   = useNavigate();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const intervalRef = useRef(null);

  const [dateTime, setDateTime]         = useState(new Date());
  const [recognized, setRecognized]     = useState(null); // { name, student_id, department }
  const [scanStatus, setScanStatus]     = useState('scanning'); // 'scanning' | 'success' | 'error' | 'warning'
  const [statusMsg, setStatusMsg]       = useState('');
  const [cameraReady, setCameraReady]   = useState(false);
  const [showInfo, setShowInfo]         = useState(false);

  // ── Live clock ────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDay  = (d) => d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const formatDate = (d) => {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd} / ${mm} / ${yy}`;
  };

  // ── Start camera ──────────────────────────────────
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setScanStatus('error');
        setStatusMsg('Camera access denied or unavailable.');
      }
    };

    startCamera();

    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Frame capture & recognition loop ─────────────
  useEffect(() => {
    if (!cameraReady) return;

    intervalRef.current = setInterval(async () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const frameData = canvas.toDataURL('image/jpeg', 0.7);

      try {
        const res = await fetch('http://localhost:5000/api/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: frameData, mode }),
        });

        const data = await res.json();

        if (res.ok && data.recognized) {
          clearInterval(intervalRef.current);
          setRecognized({
            name:       data.student,
            student_id: data.student_id,
            department: data.department,
          });
          setScanStatus('success');
          setShowInfo(true);

          // Show info panel for 2s, then fire alert and go back
          setTimeout(() => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            showEntryExitAlert({
              action:     data.action,
              student:    data.student,
              department: data.department,
            });
            navigate(-1);
          }, 2000);

        } else if (data.action === 'ALREADY_ENTERED' || data.action === 'ALREADY_EXITED') {
          clearInterval(intervalRef.current);
          setScanStatus('warning');
          setStatusMsg(data.message);
          setRecognized({
            name:       data.student,
            student_id: data.student_id,
            department: data.department,
          });
          setShowInfo(true);
          setTimeout(() => navigate(-1), 3000);

        } else {
          setScanStatus('scanning');
        }
      } catch {
        // Network/server error — keep scanning silently
      }
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [cameraReady]);

  // ── Status border color ───────────────────────────
  const borderColor = {
    scanning: 'rgba(255,255,255,0.2)',
    success:  '#86efac',
    warning:  '#fde68a',
    error:    '#fca5a5',
  }[scanStatus];

  return (
    <div className="facescan-page">

      {/* ── Camera viewport ── */}
      <div className="facescan-viewport" style={{ borderColor }}>

        {/* Live video */}
        <video
          ref={videoRef}
          className="facescan-video"
          autoPlay playsInline muted
        />

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Instruction text — only while scanning */}
        {scanStatus === 'scanning' && (
          <div className="facescan-instruction">
            <p>Please look at the camera<br />and position your face within the<br />on-screen frame.</p>
          </div>
        )}

        {/* Corner brackets */}
        <div className="scan-corner tl" />
        <div className="scan-corner tr" />
        <div className="scan-corner bl" />
        <div className="scan-corner br" />

        {/* Scan line animation while scanning */}
        {scanStatus === 'scanning' && <div className="scan-line" />}

        {/* Error message */}
        {scanStatus === 'error' && (
          <div className="facescan-error-msg">{statusMsg}</div>
        )}

        {/* Warning message */}
        {scanStatus === 'warning' && (
          <div className="facescan-warning-msg">{statusMsg}</div>
        )}

        {/* ── Bottom info panel — shown on recognition ── */}
        <div className={`facescan-info-panel ${showInfo ? 'visible' : ''}`}>
          <div className="facescan-student-info">
            <p className="info-name">{recognized?.name ?? ''}</p>
            <p className="info-detail">Student ID: {recognized?.student_id ?? ''}</p>
            <p className="info-detail">Department: {recognized?.department ?? ''}</p>
          </div>

          <div className={`facescan-check ${scanStatus === 'success' ? 'check-success' : scanStatus === 'warning' ? 'check-warning' : ''}`}>
            <LuCircleCheckBig />
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="facescan-footer">
          <div className="facescan-logo-area">
            <img src="../logoplp.gif" alt="PLP Seal" className="facescan-seal" />
            <div className="facescan-uni-info">
              <span className="facescan-uni-name">Pamantasan ng Lungsod ng Pasig</span>
              <span className="facescan-uni-sub">ENTRANCE AND EXIT MONITORING SYSTEM</span>
            </div>
          </div>

          <div className="facescan-clock">
            <div className="facescan-date-block">
              <span className="facescan-day">{formatDay(dateTime)}</span>
              <span className="facescan-date">{formatDate(dateTime)}</span>
            </div>
            <span className="facescan-time">{formatTime(dateTime)}</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default FaceScan;