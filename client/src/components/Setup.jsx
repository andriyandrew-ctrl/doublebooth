import React, { useState, useEffect } from 'react';
import { LAYOUTS, FRAMES } from '../constants';
import { Copy, Check, ArrowRight } from 'lucide-react';

export default function Setup({ 
  roomCode, 
  users, 
  connectionState,
  leaveRoom,
  boothConfig,
  setBoothConfig,
  onSetupComplete
}) {
  const isSingleMode = roomCode === 'SINGLE' || roomCode === 'SINGLE_MODE';
  const [step, setStep] = useState(isSingleMode ? 'strip' : 'waiting');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const partnerJoined = users.length === 2;

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}>
      {step === 'waiting' && (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '600px' }}>
          <h2 className="section-title">YOUR CODE</h2>
          <div className="code-display">
            {roomCode.split('').map((char, i) => (
              <div key={i} className="code-digit">{char}</div>
            ))}
          </div>
          
          <button className="btn btn-outline" style={{ marginBottom: '3rem' }} onClick={handleCopyLink}>
            {copied ? <><Check size={16} /> copied to clipboard</> : <><Copy size={16} /> copy link</>}
          </button>

          {!partnerJoined ? (
            <div className="waiting-text">
              <div className="waiting-spinner" />
              waiting for partner...
            </div>
          ) : (
            <div className="waiting-text" style={{ color: 'var(--success)' }}>
              <Check size={16} /> partner joined!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setStep('strip')}
              disabled={!partnerJoined}
              style={{ width: '100%', padding: '1.25rem' }}
            >
              start the session now <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline" onClick={leaveRoom}>
              Cancel & Leave
            </button>
          </div>
        </div>
      )}

      {step === 'strip' && (
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h2 className="section-title">CHOOSE YOUR STRIP</h2>
          
          <div className="setup-grid">
            {LAYOUTS.map(layout => (
              <div 
                key={layout.id} 
                className={`strip-card ${boothConfig.layout === layout.id ? 'selected' : ''}`}
                onClick={() => setBoothConfig({ ...boothConfig, layout: layout.id })}
              >
                {layout.id === '1x4' ? (
                  <div className="strip-icon-1x4">
                    <div/><div/><div/><div/>
                  </div>
                ) : (
                  <div className="strip-icon-2x2">
                    <div/><div/><div/><div/>
                  </div>
                )}
                <div className="strip-label">{layout.name}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button className="btn btn-primary" style={{ padding: '1rem 3rem' }} onClick={() => setStep('theme')}>
              Next Step <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 'theme' && (
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h2 className="section-title">PICK A THEME PACK</h2>
          
          <div className="theme-pack-list">
            {FRAMES.map(frame => (
              <div 
                key={frame.id}
                className={`theme-pack-card ${boothConfig.frame === frame.id ? 'selected' : ''}`}
                onClick={() => setBoothConfig({ ...boothConfig, frame: frame.id })}
              >
                <div className={`theme-preview-box ${frame.id}`}>
                  {frame.id === 'frame-cute' && '❤️'}
                  {frame.id === 'frame-retro' && '🎞️'}
                  {frame.id === 'frame-classic' && '✨'}
                  {frame.id === 'frame-minimalist' && '⬜'}
                </div>
                <div className="theme-pack-info">
                  <div className="theme-pack-title">{frame.name}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ padding: '1rem 2rem' }} onClick={() => setStep('strip')}>
              Back
            </button>
            <button className="btn btn-primary" style={{ padding: '1rem 3rem' }} onClick={onSetupComplete}>
              Open Camera <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
