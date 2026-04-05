// QRScanModal.jsx
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import '../componentscss/QRScanModal.css';
import { showEntryExitAlert } from '../components/ShowEntryExitAlerts.jsx';

function QRScanModal({ onClose, mode = 'ENTRY' }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);

  const [status, setStatus]   = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Start camera ──────────────────────────────────
  useEffect(() => {
    let isMounted = true; // track component mounted state
  
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
  
        if (!isMounted) {
          // Component unmounted before stream ready
          stream.getTracks().forEach(track => track.stop());
          return;
        }
  
        streamRef.current = stream;
  
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (err) {
            console.warn('Video play interrupted:', err.message);
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setStatus({ type: 'error', message: 'Camera access denied or unavailable.' });
      }
    };
  
    startCamera();
  
    return () => {
      isMounted = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // ── QR scan loop ──────────────────────────────────
  const scanFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && !scanned) {
        setScanned(true);
        handleQRResult(code.data);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  };

  // ── Submit decoded QR ─────────────────────────────
  const handleQRResult = async (qrData) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('http://localhost:5000/api/qrscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_data: qrData,
          mode,        
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'QR scan failed.');

      setStatus({ type: 'success', message: data.message });
      onClose();
            showEntryExitAlert({
              action:     data.action,
              student:    data.student,
              department: data.department,
      });

    } catch (err) {
      setStatus({ type: 'error', message: err.message });
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span>Scan QR Code</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="qr-viewport">
            <video ref={videoRef} className="qr-video" muted playsInline />
            <canvas ref={canvasRef} className="qr-canvas" />
            <div className="qr-overlay">
              <div className="qr-corner tl" /><div className="qr-corner tr" />
              <div className="qr-corner bl" /><div className="qr-corner br" />
            </div>
          </div>

          <p className="modal-hint">
            <span style={{ fontWeight: 'bold' }}>For Student: </span>Position your QR found in school ID to the scanner.* <br />
            <span style={{ fontWeight: 'bold' }}>For Visitor: </span>Position your QR receive from the email.*
          </p>

          {loading && <p className="modal-status info">Processing scan…</p>}
          {status  && <p className={`modal-status ${status.type}`}>{status.message}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn submit"
            onClick={() => { setScanned(false); setStatus(null); }}
            disabled={loading}
          >
            Retry
          </button>
        </div>

      </div>
    </div>
  );
}

export default QRScanModal;