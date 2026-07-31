import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Wand2, Frame, CheckCircle, Image as ImageIcon, Smile } from 'lucide-react';
import useMediaPipe, { AR_FILTERS } from '../hooks/useMediaPipe';
import { BACKGROUNDS } from '../constants';

const FILTERS = [
  { id: 'normal', name: 'Original', class: 'filter-normal' },
  { id: 'vintage-lomo', name: 'Lomo Retro', class: 'filter-vintage-lomo' },
  { id: 'vintage-warm', name: 'Vintage Warm', class: 'filter-vintage-warm' },
  { id: 'retro-grayscale', name: 'Classic B&W', class: 'filter-retro-grayscale' },
  { id: 'cyberpunk-cyan', name: 'Cyber Neon', class: 'filter-cyberpunk-cyan' },
  { id: 'y2k-acid', name: 'Y2K Acid Green', class: 'filter-y2k-acid' },
  { id: 'pastel-dream', name: 'Pastel Dream', class: 'filter-pastel-dream' },
  { id: 'tokyo-drift', name: 'Tokyo Cool', class: 'filter-tokyo-drift' },
  { id: 'high-contrast-bw', name: 'Noir B&W', class: 'filter-high-contrast-bw' }
];

// We will use the ones from constants instead of declaring them here.

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
  replaceLocalStream
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);

  const [localPhotos, setLocalPhotos] = useState({});
  const [countdownNumber, setCountdownNumber] = useState(null);
  
  // MediaPipe state
  const [selectedBg, setSelectedBg] = useState('bg-none');
  const [selectedArFilter, setSelectedArFilter] = useState('none');
  
  const { processedStream, isModelsLoaded } = useMediaPipe(localStream, selectedBg, selectedArFilter);

  const [statusMessage, setStatusMessage] = useState('Tekan "Mulai Foto" untuk memulai sesi 4 pose.');

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

  // We rely on processedStream instead of localStream.

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

      const dataUrl = canvas.toDataURL('image/jpeg', 0.70); // High quality fallback, ~30-40KB
      sendPreviewFrame(dataUrl);
    }, 400); // 2.5 FPS for a smoother, clearer feed

    return () => clearInterval(interval);
  }, [processedStream, sendPreviewFrame, isCountdownRunning]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Sync peer filter choices
  useEffect(() => {
    if (peerFilter) {
      setSelectedFilter(peerFilter);
    }
  }, [peerFilter]);

  // Sync peer frame choices
  useEffect(() => {
    if (peerFrame) {
      setSelectedFrame(peerFrame);
    }
  }, [peerFrame]);

  // Filter Selection handler
  const handleFilterSelect = (filterClass) => {
    setSelectedFilter(filterClass);
    sendFilterSelection(filterClass);
  };

  // Frame Selection handler
  const handleFrameSelect = (frameClass) => {
    setSelectedFrame(frameClass);
    sendFrameSelection(frameClass);
  };

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
    if (!video) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Use native video dimensions
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    // Flip context horizontally to save mirrored photo (matching preview)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    // Save locally
    setLocalPhotos(prev => {
      const updated = { ...prev, [index]: dataUrl };
      // Share with peer
      shareCapturedPhoto(index, dataUrl);
      return updated;
    });
  };

  // Check if all photos from both users are successfully synced
  useEffect(() => {
    const localKeys = Object.keys(localPhotos);
    const peerKeys = Object.keys(peerPhotos);

    if (localKeys.length === 4 && peerKeys.length === 4) {
      // Trigger callback to transition to gallery
      setTimeout(() => {
        onPhotosComplete({
          local: localPhotos,
          peer: peerPhotos,
          filter: selectedFilter,
          frame: selectedFrame
        });
      }, 1500);
    }
  }, [localPhotos, peerPhotos, selectedFilter, selectedFrame, onPhotosComplete]);

  const peerUser = users.find(u => u.id !== users[0]?.id && users.length > 1) || users[0]; // dummy reference

  return (
    <div className="booth-layout">
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Screen layout */}
      <div className="booth-grid">
        {/* Local Stream */}
        <div className="booth-feed-wrapper active-local">
          <div className="video-container">
            <video
              ref={localVideoRef}
              className={`video-feed ${selectedFilter}`}
              autoPlay
              playsInline
              muted
            />
            {/* Viewfinder Camera HUD Overlay */}
            <div className="camera-hud">
              <div className="hud-top">
                <div className="hud-battery">🔋 100%</div>
                <div className="hud-rec">
                  <span className="rec-dot" />
                  REC
                </div>
              </div>
              <div className="hud-center">
                <div className="focus-cross" />
              </div>
              <div className="hud-bottom">
                <div className="hud-iso">ISO 200</div>
                <div className="hud-time">1080P 30FPS</div>
              </div>
            </div>
            {isCountdownRunning && activePhotoIndex !== -1 && countdownNumber !== null && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdownNumber}</div>
              </div>
            )}
            <div className="feed-label">
              <div className="connection-quality" />
              <span>Anda ({users[0]?.name})</span>
            </div>
          </div>
        </div>

        {/* Remote Stream */}
        <div className="booth-feed-wrapper active-peer">
          <div className="video-container">
            {remoteStream && connectionState === 'connected' ? (
              <video
                ref={remoteVideoRef}
                className={`video-feed ${selectedFilter}`}
                autoPlay
                playsInline
              />
            ) : remotePreviewFrame ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={remotePreviewFrame}
                  className={`video-feed ${selectedFilter}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt="Remote Preview"
                />
                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(16, 185, 129, 0.85)', backdropFilter: 'blur(4px)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', animation: 'hud-pulse 1s infinite' }} />
                  Sync Stream
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', background: '#080710', color: 'var(--text-secondary)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--secondary)' }} />
                <span>Menghubungkan Feed Kamera Teman...</span>
                {users.length > 1 && (
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    (Sesi tetap sinkron via socket channel)
                  </span>
                )}
              </div>
            )}
            {/* Viewfinder Camera HUD Overlay */}
            <div className="camera-hud">
              <div className="hud-top">
                <div className="hud-battery">🔋 100%</div>
                <div className="hud-rec">
                  <span className="rec-dot" />
                  REC
                </div>
              </div>
              <div className="hud-center">
                <div className="focus-cross" />
              </div>
              <div className="hud-bottom">
                <div className="hud-iso">ISO 200</div>
                <div className="hud-time">1080P 30FPS</div>
              </div>
            </div>
            {isCountdownRunning && activePhotoIndex !== -1 && countdownNumber !== null && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdownNumber}</div>
              </div>
            )}
            <div className="feed-label">
              <div className={`connection-quality ${connectionState === 'connected' ? '' : 'connecting'}`} />
              <span>Teman ({users.length > 1 ? users.find(u => u.id !== users[0].id)?.name : 'Menunggu...'})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="glass booth-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Studio Photobooth
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="panel-section glass booth-controls" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!isModelsLoaded && (
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '8px', color: '#f59e0b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Sedang memuat AI (Filter Wajah & Latar Belakang)... Harap tunggu sebentar sebelum filter bisa digunakan.
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={startCountdown}
            disabled={isCountdownRunning || activePhotoIndex >= 4}
            style={{ padding: '1.25rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center' }}
          >
            <Camera size={24} /> {isCountdownRunning ? 'Mengambil Foto...' : 'Mulai Foto (4 Pose)'}
          </button>

          {/* AI Background Selection */}
          <div className="selection-carousel-container" style={{ marginTop: '1.5rem' }}>
            <span className="selection-title"><ImageIcon size={14} /> Virtual Background</span>
            <div className="options-scroll">
              <button
                className={`option-btn ${selectedBg === 'bg-none' ? 'selected' : ''}`}
                onClick={() => setSelectedBg('bg-none')}
              >
                Tanpa Latar
              </button>
              {BACKGROUNDS.filter(b => b.isImage).map((bg) => (
                <button
                  key={bg.id}
                  className={`option-btn ${selectedBg === bg.id ? 'selected' : ''}`}
                  onClick={() => setSelectedBg(bg.id)}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>

          {/* AR Face Filter Selection */}
          <div className="selection-carousel-container" style={{ marginTop: '1rem' }}>
            <span className="selection-title"><Smile size={14} /> Sticker AR Wajah</span>
            <div className="options-scroll">
              {AR_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  className={`option-btn ${selectedArFilter === filter.id ? 'selected' : ''}`}
                  onClick={() => setSelectedArFilter(filter.id)}
                >
                  {filter.emoji && <span style={{marginRight: '5px'}}>{filter.emoji}</span>}
                  {filter.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="session-progress-bar">
          {[0, 1, 2, 3].map((index) => {
            const isCapturing = activePhotoIndex === index;
            const isDone = localPhotos[index] && peerPhotos[index];
            return (
              <div 
                key={index}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <div className={`progress-dot ${isCapturing ? 'active' : ''} ${isDone ? 'captured' : ''}`} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isCapturing ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--text-secondary)' }}>
                  Pose {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
