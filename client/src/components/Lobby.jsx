import React, { useState } from 'react';
import { Camera, Plus, LogIn, Sparkles } from 'lucide-react';

export default function Lobby({ createRoom, joinRoom }) {
  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

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

  return (
    <div className="lobby-grid">
      {/* Brand card */}
      <div className="lobby-card glass" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div style={{ marginBottom: '1.5rem', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255, 0, 127, 0.1)', color: 'var(--primary)', width: 'fit-content' }}>
          <Camera size={32} />
        </div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Dual Booth <Sparkles size={20} style={{ color: 'var(--secondary)' }} />
        </h2>
        <p>
          Bersenang-senang bersama teman dari device yang berbeda! Masuk ke room yang sama, pose bersama secara real-time, dan buat strip foto photobooth retro yang menakjubkan secara instan.
        </p>
        <div className="input-group">
          <label className="input-label">Nama Panggilan Anda</label>
          <input
            type="text"
            className="input-field"
            placeholder="Masukkan nama Anda (misal: Sarah)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            required
          />
        </div>
      </div>

      {/* Action card */}
      <div className="lobby-card glass" style={{ borderLeft: '4px solid var(--secondary)' }}>
        <h2 style={{ marginBottom: '1rem' }}>Mulai Sesi Foto</h2>
        
        {/* Create room */}
        <form onSubmit={handleCreate}>
          <p style={{ marginBottom: '1rem' }}>Buat room baru dan bagikan kodenya kepada teman Anda.</p>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <Plus size={18} /> Buat Room Baru
          </button>
        </form>

        <div className="divider">ATAU</div>

        {/* Join room */}
        <form onSubmit={handleJoin}>
          <p style={{ marginBottom: '1rem' }}>Punya kode room? Masukkan kodenya di bawah untuk bergabung.</p>
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Masukkan 6-Digit Kode Room (misal: ABCDEF)"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}
              required
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            <LogIn size={18} /> Bergabung ke Room
          </button>
        </form>
      </div>
    </div>
  );
}
