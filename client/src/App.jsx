import React, { useState, useEffect } from 'react';
import useWebRTC from './hooks/useWebRTC';
import Lobby from './components/Lobby';
import Setup from './components/Setup';
import Booth from './components/Booth';
import Gallery from './components/Gallery';
import { Camera, Sparkles } from 'lucide-react';

export default function App() {
  const {
    socket,
    roomCode,
    users,
    localStream,
    remoteStream,
    connectionState,
    peerPhotos,
    isCountdownRunning,
    setIsCountdownRunning,
    activePhotoIndex,
    setActivePhotoIndex,
    flashActive,
    setFlashActive,
    peerFilter,
    peerFrame,
    startCamera,
    stopCamera,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startCountdown,
    shareCapturedPhoto,
    sendFilterSelection,
    sendFrameSelection,
    resetSession
  } = useWebRTC();

  const [appState, setAppState] = useState('LOBBY'); // LOBBY, SETUP, BOOTH, GALLERY
  const [capturedPhotos, setCapturedPhotos] = useState(null);

  // Automatically transition between Lobby and Setup when room code is set/cleared
  useEffect(() => {
    if (!roomCode) {
      setAppState('LOBBY');
      setCapturedPhotos(null);
    } else if (roomCode && appState === 'LOBBY') {
      setAppState('SETUP');
    }
  }, [roomCode]);

  // Transition from Setup to Booth when BOTH participants are ready
  useEffect(() => {
    if (
      roomCode &&
      users.length === 2 &&
      users.every((u) => u.ready) &&
      appState === 'SETUP'
    ) {
      setAppState('BOOTH');
    }
  }, [users, roomCode, appState]);

  // Handle peer leaving during active session
  useEffect(() => {
    if (
      roomCode &&
      users.length < 2 &&
      (appState === 'BOOTH' || appState === 'GALLERY')
    ) {
      alert('Teman Anda terputus atau meninggalkan room. Mengembalikan Anda ke ruang persiapan.');
      setAppState('SETUP');
      setCapturedPhotos(null);
    }
  }, [users, roomCode, appState]);

  // Watch for socket session resets (to clear gallery and go back to booth)
  useEffect(() => {
    // Check if peerPhotos is reset from hook
    if (appState === 'GALLERY' && Object.keys(peerPhotos).length === 0) {
      setCapturedPhotos(null);
      setAppState('BOOTH');
    }
  }, [peerPhotos, appState]);

  // Handle URL share code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && appState === 'LOBBY') {
      // Find the join input field (Lobby component handles this normally, but we can let them know)
      console.log('Room param detected:', roomParam);
    }
  }, []);

  const handlePhotosComplete = (data) => {
    const isHost = users[0] && socket && socket.id === users[0].id;
    const orderedPhotos = {
      // Host is always photoA (drawn on left), Guest is always photoB (drawn on right)
      photoA: isHost ? data.local : data.peer,
      photoB: isHost ? data.peer : data.local,
      filter: data.filter,
      frame: data.frame
    };
    setCapturedPhotos(orderedPhotos);
    setAppState('GALLERY');
  };

  return (
    <div className="app-container">
      {/* Floating camera flash overlay */}
      <div className={`flash-effect ${flashActive ? 'flash-active' : ''}`} />

      {/* Header (Hidden on Print) */}
      <header className="app-header">
        <div className="logo">
          <Camera size={26} style={{ color: 'var(--primary)' }} />
          <span>Double<b>Booth</b></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {roomCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Room:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{roomCode}</span>
            </div>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} style={{ color: 'var(--primary)' }} /> Real-Time Sync
          </span>
        </div>
      </header>

      {/* App views */}
      <main style={{ flex: 1 }}>
        {appState === 'LOBBY' && (
          <Lobby createRoom={createRoom} joinRoom={joinRoom} />
        )}
        
        {appState === 'SETUP' && (
          <Setup
            roomCode={roomCode}
            users={users}
            localStream={localStream}
            startCamera={startCamera}
            stopCamera={stopCamera}
            toggleReady={toggleReady}
            connectionState={connectionState}
            leaveRoom={leaveRoom}
          />
        )}

        {appState === 'BOOTH' && (
          <Booth
            users={users}
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            peerPhotos={peerPhotos}
            isCountdownRunning={isCountdownRunning}
            setIsCountdownRunning={setIsCountdownRunning}
            activePhotoIndex={activePhotoIndex}
            setActivePhotoIndex={setActivePhotoIndex}
            flashActive={flashActive}
            setFlashActive={setFlashActive}
            peerFilter={peerFilter}
            peerFrame={peerFrame}
            shareCapturedPhoto={shareCapturedPhoto}
            sendFilterSelection={sendFilterSelection}
            sendFrameSelection={sendFrameSelection}
            startCountdown={startCountdown}
            resetSession={resetSession}
            onPhotosComplete={handlePhotosComplete}
          />
        )}

        {appState === 'GALLERY' && capturedPhotos && (
          <Gallery
            photoData={capturedPhotos}
            resetSession={resetSession}
          />
        )}
      </main>
    </div>
  );
}
