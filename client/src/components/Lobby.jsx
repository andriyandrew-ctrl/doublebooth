import React, { useState } from 'react';
import { Camera, Plus, LogIn, Sparkles, User, Users } from 'lucide-react';

export default function Lobby({ createRoom, joinRoom }) {
  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('Please enter a nickname first!');
      return;
    }
    createRoom(nickname.trim());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('Please enter a nickname first!');
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.length !== 6) {
      alert('Room code must be exactly 6 characters!');
      return;
    }
    joinRoom(roomCodeInput.trim().toUpperCase(), nickname.trim());
  };

  const handleSingleMode = (e) => {
    e.preventDefault();
    createRoom('SINGLE_MODE');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Capture moments <br />together, instantly.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          Enter a room with your friends, pose together in real-time, and get a beautiful photo strip in seconds.
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', marginBottom: '2rem' }}>
        <div className="input-group" style={{ marginBottom: '2rem' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} /> YOUR NAME
          </label>
          <input
            type="text"
            className="input-field input-field-large"
            placeholder="Enter your nickname..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={handleCreate} style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem' }}>
            <Plus size={20} /> Create New Session
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', color: 'var(--text-tertiary)' }}>
            <div style={{ flex: 1, height: '2px', background: 'var(--card-border)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>OR JOIN WITH CODE</span>
            <div style={{ flex: 1, height: '2px', background: 'var(--card-border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              className="input-field input-field-large"
              placeholder="6-DIGIT CODE"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ width: '100%', textTransform: 'uppercase', textAlign: 'center', fontWeight: '900', letterSpacing: '4px' }}
            />
            <button className="btn btn-secondary" onClick={handleJoin} style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem' }}>
              Join Room
            </button>
          </div>
        </div>
      </div>

      <button className="btn btn-outline" onClick={handleSingleMode} style={{ padding: '1rem 2rem', color: 'var(--text-secondary)' }}>
        <Sparkles size={16} /> I just want to take photos alone (Single Mode)
      </button>
    </div>
  );
}
