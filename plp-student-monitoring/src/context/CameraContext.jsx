import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

const CameraContext = createContext();

export const useCameraContext = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return context;
};

export const CameraProvider = ({ children }) => {
  const [cameraFrame, setCameraFrame]     = useState(null);
  const [cameraStatus, setCameraStatus]   = useState('neutral');
  const [detectedFace, setDetectedFace]   = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoStream, setVideoStreamState]  = useState(null);

  const videoRef         = useRef(null);
  const canvasRef        = useRef(null);
  const streamRef        = useRef(null);
  const frameIntervalRef = useRef(null);

  // ── Cleanup only on unmount ───────────────────────
  // No auto-init here — camera is started explicitly
  // by whichever component actually needs it.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log("🔴 Cleaning up camera stream");
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  // ── Called explicitly by FaceRecognition component ─
  const initializeCamera = async () => {
    // Guard: don't open a second stream if one already exists
    if (streamRef.current) {
      console.log("📷 Camera already initialized, skipping.");
      return;
    }

    try {
      console.log("📷 Initializing camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      setVideoStreamState(stream);
      setIsCameraActive(true);
      console.log("✅ Camera initialized successfully");

      startFrameCapture();
    } catch (err) {
      console.error("❌ Error initializing camera:", err);
      setIsCameraActive(false);
    }
  };

  // ── Called explicitly to release the camera ───────
  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log("🔴 Camera released.");
    }
    stopFrameCapture();
    setVideoStreamState(null);
    setIsCameraActive(false);
    setCameraFrame(null);
  }, []);

  const updateCameraFrame = useCallback((imageData) => {
    if (!imageData) return;
    setCameraFrame(imageData);
  }, []);

  const updateCameraStatus = useCallback((status, faceData = null) => {
    console.log(`🎯 CameraContext: Updating status to: ${status}`);
    setCameraStatus(status);
    setDetectedFace(faceData || null);
  }, []);

  const resetCameraState = useCallback(() => {
    console.log('🔄 CameraContext: Resetting camera state');
    setCameraStatus('neutral');
    setDetectedFace(null);
  }, []);

  const setActiveCameraState = useCallback((isActive) => {
    console.log(`📹 CameraContext: Setting camera active to: ${isActive}`);
    setIsCameraActive(isActive);
  }, []);

  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    console.log('▶️ CameraContext: Starting frame capture');
    frameIntervalRef.current = setInterval(() => {
      if (streamRef.current && videoRef.current) {
        try {
          if (!videoRef.current.srcObject && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }

          if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width  = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const frameData = canvasRef.current.toDataURL('image/jpeg', 0.7);
            setCameraFrame(frameData);
          }
        } catch (err) {
          console.error('❌ CameraContext: Error capturing frame:', err);
        }
      }
    }, 100);
  }, []);

  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      console.log('⏹️ CameraContext: Stopped frame capture');
    }
  }, []);

  const setVideoStream = useCallback((stream) => {
    console.log(`🎥 CameraContext: Setting video stream: ${!!stream}`);
    if (stream) {
      streamRef.current = stream;
      setVideoStreamState(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      startFrameCapture();
    } else {
      stopFrameCapture();
      setVideoStreamState(null);
      setIsCameraActive(false);
    }
  }, [startFrameCapture, stopFrameCapture]);

  const getVideoStream = useCallback(() => {
    return streamRef.current;
  }, []);

  const value = useMemo(() => ({
    cameraFrame,
    cameraStatus,
    detectedFace,
    isCameraActive,
    videoStream,
    videoRef,
    initializeCamera,   // ← now exposed so components call it explicitly
    releaseCamera,      // ← exposed so FaceRecognition can clean up on unmount
    updateCameraFrame,
    updateCameraStatus,
    resetCameraState,
    setActiveCameraState,
    setVideoStream,
    getVideoStream,
  }), [cameraFrame, cameraStatus, detectedFace, isCameraActive, videoStream]);

  return (
    <CameraContext.Provider value={value}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      {children}
    </CameraContext.Provider>
  );
};