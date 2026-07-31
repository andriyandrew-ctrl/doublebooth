import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Copy, Check, Users, ShieldAlert, ArrowRight, LayoutGrid, Frame } from 'lucide-react';
import { LAYOUTS, FRAMES } from '../constants';

export default function Setup({ 
  roomCode, 
  users, 
  localStream, 
  startCamera, 
  stopCamera, 
  toggleReady, 
  connectionState,
  leaveRoom,
  boothConfig,
  setBoothConfig
}) {
  const localVideoRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize camera preview
  useEffect(() => {
    let active = true;
    
    async function initCamera() {
      try {
        const stream = await startCamera();
        if (active && localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Camera initialization failed', err);
        setCameraActive(false);
      }
    }
    
    initCamera();

    return () => {
      active = false;
    };
  }, [startCamera]);

  // Sync ref when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleCopyLink = () => {
    // Generate joining URL
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReadyToggle = () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    toggleReady(nextReady);
  };

  const myUserInfo = users.find(u => u.id === localStream?.id || u.ready !== undefined); // fallback
  const peerUser = users.find(u => u.id !== myUserInfo?.id);

  return (
    <div className="setup-container">
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Persiapan Kamera</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sesuaikan posisi kamera dan pastikan teman Anda bergabung.</p>
        </div>
        <button className="btn btn-outline btn-danger" onClick={leaveRoom}>
          Keluar Room
        </button>
      </div>

      <div className="setup-grid">
        {/* Camera preview */}
        <div className="setup-preview-card glass">
          <div className="video-container">
            {cameraActive ? (
              <video
                ref={localVideoRef}
                className="video-feed"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
                <ShieldAlert size={48} style={{ color: '#f59e0b' }} />
                <h3>Akses Kamera Diperlukan</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Aplikasi ini membutuhkan akses kamera untuk mengambil foto.
                </p>
                <button className="btn btn-secondary" onClick={() => startCamera().then(() => setCameraActive(true))}>
                  Aktifkan Kamera
                </button>
              </div>
            )}
            <div className="feed-label">
              <Video size={14} style={{ color: cameraActive ? 'var(--success)' : '#ef4444' }} /> 
              <span>Kamera Anda</span>
            </div>
          </div>
        </div>

        {/* Room status and actions */}
        <div className="setup-status-card glass">
          <div>
            <div className="room-info-badge">
              <span className="input-label">Kode Room Anda</span>
              <div className="room-code-display">{roomCode}</div>
              <button 
                className="btn btn-outline" 
                onClick={handleCopyLink} 
                style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {copied ? (
                  <><Check size={14} style={{ color: 'var(--success)' }} /> Link Disalin!</>
                ) : (
                  <><Copy size={14} /> Salin Link Undangan</>
                )}
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Anggota Room ({users.length}/2)
              </h3>
              
              <div className="participant-list">
                {users.map((user) => {
                  const isMe = user.id === users[0]?.id && users.length === 1 || users.find(u => u.name === user.name && u.id === user.id); // placeholder logic, simpler: we check against socket ID inside parent.
                  return (
                    <div key={user.id} className="participant-item">
                      <span style={{ fontWeight: 600 }}>
                        {user.name} {user.id === users[0]?.id && users.length > 1 ? '(Host)' : ''}
                      </span>
                      <div className="participant-status">
                        <span className={`status-badge ${user.ready ? 'status-ready' : 'status-waiting'}`}>
                          {user.ready ? 'SIAP' : 'BELUM SIAP'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {users.length < 2 && (
                  <div className="participant-item" style={{ borderStyle: 'dashed', background: 'transparent', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Menunggu teman bergabung...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {users.length === 2 && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Koneksi Real-time:</span>
                  <span style={{ fontWeight: 'bold', color: connectionState === 'connected' ? 'var(--success)' : '#f59e0b' }}>
                    {connectionState === 'connected' ? 'Hubungan Terjalin' : 'Menghubungkan...'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {connectionState === 'connected' 
                    ? 'Peer WebRTC tersambung! Anda dapat saling melihat video secara real-time.' 
                    : 'Sedang menghubungkan video antar device. Sesi foto tetap dapat berjalan menggunakan backup sync.'}
                </p>
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          <div className="setup-config-card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
            <h3>Pengaturan Strip Foto</h3>
            
            <div className="selection-carousel-container">
              <span className="selection-title"><LayoutGrid size={12} /> Pilih Layout (Bentuk Foto)</span>
              <div className="options-scroll">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    className={`option-btn ${boothConfig.layout === l.id ? 'selected' : ''}`}
                    onClick={() => setBoothConfig(prev => ({ ...prev, layout: l.id }))}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-carousel-container">
              <span className="selection-title"><Frame size={12} /> Pilih Desain Frame</span>
              <div className="options-scroll">
                {FRAMES.map((fr) => (
                  <button
                    key={fr.id}
                    className={`option-btn ${boothConfig.frame === fr.id ? 'selected' : ''}`}
                    onClick={() => setBoothConfig(prev => ({ ...prev, frame: fr.id }))}
                  >
                    {fr.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'}`}
                style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', display: 'flex', justifyContent: 'center' }}
                onClick={handleReadyToggle}
                disabled={!cameraActive || (users.length < 2 && roomCode !== 'SINGLE')}
              >
                {isReady ? (
                  <><Check size={20} /> Siap! Menunggu Teman...</>
                ) : (
                  <><Check size={20} /> Saya Siap Memotret</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
