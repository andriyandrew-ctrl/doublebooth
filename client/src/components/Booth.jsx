import React, { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import useMediaPipe, { AR_FILTERS } from '../hooks/useMediaPipe';
import { BACKGROUNDS } from '../constants';

export default function Booth({
  users,
  localStream,
  remoteStream,
  connectionState,
  peerPhotos,
  remotePreviewFrame,
  isCountdownRunning,
  setIsCountdownRunning,
  activePhotoIndex,
  setActivePhotoIndex,
  flashActive,
  setFlashActive,
  peerFilter,
  peerFrame,
  shareCapturedPhoto,
  sendPreviewFrame,
  sendFilterSelection,
  sendFrameSelection,
  startCountdown,
  resetSession,
  onPhotosComplete,
  startVideoCall,
  replaceLocalStream,
  toggleReady,
  startCamera
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);

  const [localPhotos, setLocalPhotos] = useState({});
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  // MediaPipe state
  const [selectedBg, setSelectedBg] = useState('bg-none');
  const [selectedArFilter, setSelectedArFilter] = useState('none');
  
  const { processedStream, isModelsLoaded } = useMediaPipe(localStream, selectedBg, selectedArFilter);

  const [statusMessage, setStatusMessage] = useState('Pilih background & filter, lalu klik I\'m Ready!');

  // Start camera on mount if localStream isn't ready
  useEffect(() => {
    if (!localStream && startCamera) {
      startCamera().catch(err => console.error("Failed to start camera in Booth:", err));
    }
  }, [localStream, startCamera]);

  // Render the processed stream instead of the raw webcam
  useEffect(() => {
    if (localVideoRef.current && processedStream) {
      localVideoRef.current.srcObject = processedStream;
    }
  }, [processedStream]);

  // Update the WebRTC outgoing stream with our processed stream
  useEffect(() => {
    if (processedStream) {
      replaceLocalStream(processedStream);
    }
  }, [processedStream, replaceLocalStream]);

  // Trigger WebRTC call once both users are in the booth (guarantees local tracks are ready)
  useEffect(() => {
    console.log('Booth mounted, starting video call...');
    startVideoCall();
  }, [startVideoCall]);

  // Periodically capture and send low-resolution preview frame (fallback)
  useEffect(() => {
    if (!processedStream || isCountdownRunning) return;

    const interval = setInterval(() => {
      const video = localVideoRef.current;
      if (!video || video.readyState < 2) return;

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Draw mirrored local video
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
      sendPreviewFrame(dataUrl);
    }, 400);

    return () => clearInterval(interval);
  }, [processedStream, sendPreviewFrame, isCountdownRunning]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleReadyToggle = () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    toggleReady(nextReady);
  };

  // If both are ready, start countdown
  useEffect(() => {
    if (users.length > 0 && users.every(u => u.ready) && !isCountdownRunning && Object.keys(localPhotos).length === 0) {
      // Small delay to prevent immediate recursive triggers
      const t = setTimeout(() => startCountdown(), 500);
      return () => clearTimeout(t);
    }
  }, [users, isCountdownRunning, localPhotos, startCountdown]);

  // The Countdown and Capture Sequence
  useEffect(() => {
    if (!isCountdownRunning) return;

    setLocalPhotos({});
    let currentPose = 0;

    const runCaptureCycle = async () => {
      if (currentPose >= 4) {
        setIsCountdownRunning(false);
        setActivePhotoIndex(-1);
        setStatusMessage('Foto selesai! Menggabungkan strip...');
        setIsReady(false);
        toggleReady(false);
        return;
      }

      setActivePhotoIndex(currentPose);
      setStatusMessage(`Pose ${currentPose + 1} dari 4: Bersiap!`);

      // 3 seconds countdown
      for (let seconds = 3; seconds > 0; seconds--) {
        setCountdownNumber(seconds);
        await new Promise(r => setTimeout(r, 1000));
      }

      setCountdownNumber('SMILE!');
      await new Promise(r => setTimeout(r, 400));

      // Trigger FLASH animation
      setFlashActive(true);
      captureLocalFrame(currentPose);
      setTimeout(() => setFlashActive(false), 500);

      setCountdownNumber(null);
      setStatusMessage(`Pose ${currentPose + 1} Terambil! Menunggu sinkronisasi...`);

      // Wait 3 seconds interval before the next pose
      await new Promise(r => setTimeout(r, 3000));
      currentPose++;
      runCaptureCycle();
    };

    runCaptureCycle();
  }, [isCountdownRunning]);

  // Capture current video frame in high-quality (mirrored for selfie ease)
  const captureLocalFrame = (index) => {
    const video = localVideoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Default dimensions if video isn't loaded
    const width = (video && video.videoWidth) ? video.videoWidth : 640;
    const height = (video && video.videoHeight) ? video.videoHeight : 480;
    canvas.width = width;
    canvas.height = height;

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      // Draw a black square fallback so the strip doesn't fail
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText('Camera Error', 50, 50);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    setLocalPhotos(prev => {
      const updated = { ...prev, [index]: dataUrl };
      shareCapturedPhoto(index, dataUrl);
      return updated;
    });
  };

  // Check if all photos from both users are successfully synced
  useEffect(() => {
    const localKeys = Object.keys(localPhotos);
    const peerKeys = Object.keys(peerPhotos);

    if (localKeys.length === 4 && (peerKeys.length === 4 || users.length === 1)) {
      setTimeout(() => {
        onPhotosComplete({
          local: localPhotos,
          peer: users.length === 1 ? localPhotos : peerPhotos, // fallback if single mode
          filter: 'normal', // we handle AR visually now
          frame: 'classic'
        });
      }, 1500);
    }
  }, [localPhotos, peerPhotos, onPhotosComplete, users.length]);

  return (
    <div className="booth-layout">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className={`flash-overlay ${flashActive ? 'active' : ''}`} />

      {/* Camera Grid Section */}
      <div className="booth-camera-section">
        {countdownNumber && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdownNumber}</div>
          </div>
        )}

        {users.length === 2 ? (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Local Video */}
            <div style={{ flex: 1, position: 'relative', borderRight: '2px solid #222' }}>
              <video ref={localVideoRef} className="video-feed" autoPlay playsInline muted />
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '20px', color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                You
                {users.find(u => u.id === localStream?.id)?.ready && <Check size={12} color="#10b981" />}
              </div>
            </div>
            {/* Remote Video */}
            <div style={{ flex: 1, position: 'relative' }}>
              {connectionState === 'connected' ? (
                <video ref={remoteVideoRef} className="video-feed" autoPlay playsInline />
              ) : remotePreviewFrame ? (
                <img src={remotePreviewFrame} className="video-feed" alt="Peer Preview" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
                  Menghubungkan...
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '20px', color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Partner
                {users.find(u => u.id !== localStream?.id)?.ready && <Check size={12} color="#10b981" />}
              </div>
            </div>
          </div>
        ) : (
          /* Single Mode */
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video ref={localVideoRef} className="video-feed" autoPlay playsInline muted />
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}>
              Single Mode
            </div>
          </div>
        )}
      </div>

      {/* Controls Section */}
      {!isCountdownRunning && (
        <div className="booth-controls-section">
          {/* Backgrounds */}
          <div className="selector-row">
            <div className="selector-label">
              <ImageIcon size={14} /> Background
            </div>
            <div className="selector-scroll">
              <div 
                className={`selector-item ${selectedBg === 'bg-none' ? 'selected' : ''}`}
                onClick={() => setSelectedBg('bg-none')}
                style={{ background: '#e5e7eb' }}
              />
              {BACKGROUNDS.filter(b => b.isImage).map(bg => (
                <div 
                  key={bg.id}
                  className={`selector-item ${selectedBg === bg.id ? 'selected' : ''}`}
                  onClick={() => setSelectedBg(bg.id)}
                  style={{ backgroundImage: `url(/assets/backgrounds/${bg.id}.jpg)` }}
                  title={bg.name}
                />
              ))}
            </div>
          </div>

          {/* AR Filters */}
          <div className="selector-row">
            <div className="selector-label">
              <Sparkles size={14} /> Filter
            </div>
            <div className="selector-scroll">
              {AR_FILTERS.map(filter => (
                <div 
                  key={filter.id}
                  className={`selector-item ${selectedArFilter === filter.id ? 'selected' : ''}`}
                  onClick={() => setSelectedArFilter(filter.id)}
                  title={filter.name}
                >
                  {filter.emoji || '🚫'}
                </div>
              ))}
            </div>
          </div>

          {/* Ready Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={handleReadyToggle}
              style={{ width: '100%', maxWidth: '400px', padding: '1rem' }}
              disabled={!localStream}
            >
              {isReady && users.length === 2 ? 'waiting for partner...' : isReady ? 'Get Ready!' : 'i\'m ready'}
            </button>
          </div>
        </div>
      )}

      {isCountdownRunning && (
        <div className="booth-controls-section" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{statusMessage}</h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: i < activePhotoIndex ? 'var(--primary)' : i === activePhotoIndex ? 'var(--success)' : '#e5e7eb' 
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
