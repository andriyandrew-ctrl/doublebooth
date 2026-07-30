import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, RefreshCw, Wand2, Frame, Heart } from 'lucide-react';

const POST_FILTERS = [
  { id: 'normal', name: 'Original', filter: 'none' },
  { id: 'vintage-lomo', name: 'Lomo Retro', filter: 'sepia(0.3) contrast(1.3) saturate(1.6) hue-rotate(-12deg) brightness(0.95)' },
  { id: 'vintage-warm', name: 'Vintage Warm', filter: 'sepia(0.35) contrast(1.2) saturate(1.4) hue-rotate(-10deg) brightness(0.95)' },
  { id: 'retro-grayscale', name: 'Classic B&W', filter: 'grayscale(100%) contrast(1.3) brightness(0.9)' },
  { id: 'cyberpunk-cyan', name: 'Cyber Neon', filter: 'hue-rotate(180deg) saturate(2) contrast(1.1) brightness(0.95)' },
  { id: 'y2k-acid', name: 'Y2K Acid', filter: 'hue-rotate(90deg) saturate(1.8) contrast(1.3) brightness(0.9)' },
  { id: 'pastel-dream', name: 'Pastel Dream', filter: 'saturate(1.5) hue-rotate(130deg) brightness(1.1) contrast(0.9)' },
  { id: 'tokyo-drift', name: 'Tokyo Cool', filter: 'hue-rotate(190deg) saturate(1.4) contrast(1.25) brightness(0.9)' },
  { id: 'high-contrast-bw', name: 'Noir B&W', filter: 'grayscale(100%) contrast(1.9) brightness(0.8)' }
];

const FRAMES = [
  { id: 'classic-white', name: 'Classic White', bg: '#ffffff', text: '#1f2937', font: 'Pacifico, cursive' },
  { id: 'dark-retro', name: 'Dark Cyber', bg: '#0d0d15', text: '#00f0ff', font: 'Courier New, monospace' },
  { id: 'pastel-pink', name: 'Pastel Hearts', bg: '#ffe4e6', text: '#e11d48', font: 'Pacifico, cursive' },
  { id: 'cyberpunk', name: 'Cyber Pink', bg: '#1a0033', text: '#ff007f', font: 'Impact, sans-serif' },
  { id: 'cute-stickers', name: 'Cute Lavender', bg: '#faf5ff', text: '#6b21a8', font: 'Outfit, sans-serif' }
];

export default function Gallery({ photoData, resetSession }) {
  const canvasRef = useRef(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedFrame, setSelectedFrame] = useState('classic-white');
  const [customText, setCustomText] = useState('Our Sweet Memories');
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const photoAPhotos = photoData.photoA;
  const photoBPhotos = photoData.photoB;

  // Track image elements once loaded
  const imageElementsRef = useRef({ photoA: {}, photoB: {} });

  // Set initial filter and frame from booth settings
  useEffect(() => {
    if (photoData.filter) {
      const matched = POST_FILTERS.find(f => photoData.filter.includes(f.id));
      if (matched) setSelectedFilter(matched.filter);
    }
    if (photoData.frame) {
      const matched = FRAMES.find(f => photoData.frame.includes(f.id));
      if (matched) setSelectedFrame(matched.id);
    }
  }, [photoData]);

  // Pre-load all images onto HTML Image elements
  useEffect(() => {
    const promises = [];
    const photoAImgs = {};
    const photoBImgs = {};

    for (let i = 0; i < 4; i++) {
      const srcA = photoAPhotos?.[i];
      const srcB = photoBPhotos?.[i];

      if (srcA) {
        const img = new Image();
        img.src = srcA;
        photoAImgs[i] = img;
        promises.push(new Promise((resolve) => { img.onload = resolve; }));
      }
      if (srcB) {
        const img = new Image();
        img.src = srcB;
        photoBImgs[i] = img;
        promises.push(new Promise((resolve) => { img.onload = resolve; }));
      }
    }

    Promise.all(promises).then(() => {
      imageElementsRef.current = { photoA: photoAImgs, photoB: photoBImgs };
      setImagesLoaded(true);
      triggerConfetti();
    });
  }, [photoAPhotos, photoBPhotos]);

  // Render Photobooth Strip onto Canvas
  const drawStrip = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded) return;

    const ctx = canvas.getContext('2d');
    const frameObj = FRAMES.find(f => f.id === selectedFrame) || FRAMES[0];

    // Define Dimension System
    const photoW = 400;
    const photoH = 300;
    const paddingX = 40;
    const paddingY = 40;
    const gapX = 20;
    const gapY = 20;
    const footerH = 150;

    const canvasW = paddingX * 2 + photoW * 2 + gapX;
    const canvasH = paddingY * 2 + photoH * 4 + gapY * 3 + footerH;

    canvas.width = canvasW;
    canvas.height = canvasH;

    // 1. Draw Background Frame
    ctx.fillStyle = frameObj.bg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Frame-specific decorations
    if (selectedFrame === 'dark-retro') {
      // 1. Draw filmstrip sprocket holes (horizontal cutouts)
      ctx.fillStyle = '#0b0914'; // background color of web, makes holes look cut-out!
      for (let sy = 15; sy < canvasH; sy += 45) {
        // Left sprocket hole
        ctx.fillRect(14, sy, 12, 20);
        // Right sprocket hole
        ctx.fillRect(canvasW - 26, sy, 12, 20);
      }

      // 2. Draw yellow frame numbers next to photos
      ctx.fillStyle = '#eab308'; // film amber
      ctx.font = 'bold 11px monospace';
      for (let i = 0; i < 4; i++) {
        const y = paddingY + i * (photoH + gapY);
        ctx.fillText(`KODAK 400TX`, 12, y + 25);
        ctx.fillText(`0${i+1}`, 15, y + 45);
        ctx.fillText(`▶ ${i+1}A`, 12, y + 280);
        
        ctx.fillText(`KODAK 400TX`, canvasW - 25, y + 25);
        ctx.fillText(`0${i+1}`, canvasW - 22, y + 45);
        ctx.fillText(`▶ ${i+1}A`, canvasW - 25, y + 280);
      }
    } else if (selectedFrame === 'pastel-pink') {
      // Draw actual heart vectors on margins
      ctx.fillStyle = '#f43f5e';
      const drawHeart = (x, y, size) => {
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.quadraticCurveTo(x, y, x + size / 2, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + size / 3);
        ctx.quadraticCurveTo(x + size, y + size * 2/3, x + size / 2, y + size);
        ctx.quadraticCurveTo(x, y + size * 2/3, x, y + size / 3);
        ctx.quadraticCurveTo(x, y, x, y + size / 4);
        ctx.closePath();
        ctx.fill();
      };
      
      drawHeart(12, 20, 20);
      drawHeart(canvasW - 32, 50, 16);
      drawHeart(10, 320, 18);
      drawHeart(canvasW - 28, 480, 22);
      drawHeart(14, 750, 24);
      drawHeart(canvasW - 30, 950, 18);
      drawHeart(15, canvasH - footerH, 20);
    } else if (selectedFrame === 'cute-stickers') {
      // Draw 4-point sparkle star vectors on margins
      const drawSparkle = (x, y, size) => {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.quadraticCurveTo(x, y, x + size, y);
        ctx.quadraticCurveTo(x, y, x, y + size);
        ctx.quadraticCurveTo(x, y, x - size, y);
        ctx.quadraticCurveTo(x, y, x, y - size);
        ctx.closePath();
        ctx.fillStyle = '#f5f3ff';
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      
      drawSparkle(15, 60, 10);
      drawSparkle(canvasW - 25, 120, 8);
      drawSparkle(15, 450, 12);
      drawSparkle(canvasW - 22, 600, 9);
      drawSparkle(18, 900, 14);
      drawSparkle(canvasW - 25, 1100, 10);
    } else if (selectedFrame === 'cyberpunk') {
      // Draw warning stripes on left/right borders
      ctx.fillStyle = '#facc15'; // cyber yellow
      ctx.fillRect(0, 0, 10, canvasH);
      ctx.fillRect(canvasW - 10, 0, 10, canvasH);

      // Draw cyber black warning slashes
      ctx.fillStyle = '#000000';
      for (let sy = 0; sy < canvasH; sy += 30) {
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(10, sy + 10);
        ctx.lineTo(10, sy + 20);
        ctx.lineTo(0, sy + 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(canvasW - 10, sy);
        ctx.lineTo(canvasW, sy + 10);
        ctx.lineTo(canvasW, sy + 20);
        ctx.lineTo(canvasW - 10, sy + 10);
        ctx.closePath();
        ctx.fill();
      }

      // Draw retro grid pattern in background
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.12)';
      ctx.lineWidth = 1.5;
      for (let y = 10; y < canvasH; y += 40) {
        ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(canvasW - 10, y); ctx.stroke();
      }
    }

    // 2. Draw 4 Pose Rows (Photo A & Photo B side-by-side)
    const { photoA: photoAImgs, photoB: photoBImgs } = imageElementsRef.current;

    for (let i = 0; i < 4; i++) {
      const y = paddingY + i * (photoH + gapY);

      // Photo A (Left) - Host
      const xA = paddingX;
      // Photo B (Right) - Peer
      const xB = paddingX + photoW + gapX;

      // Draw Photo A
      if (photoAImgs[i]) {
        ctx.save();
        ctx.filter = selectedFilter;
        ctx.drawImage(photoAImgs[i], xA, y, photoW, photoH);
        ctx.restore();
        
        // Draw frame border
        ctx.strokeStyle = frameObj.text;
        ctx.lineWidth = 3;
        ctx.strokeRect(xA, y, photoW, photoH);
      }

      // Draw Photo B
      if (photoBImgs[i]) {
        ctx.save();
        ctx.filter = selectedFilter;
        ctx.drawImage(photoBImgs[i], xB, y, photoW, photoH);
        ctx.restore();

        // Draw frame border
        ctx.strokeStyle = frameObj.text;
        ctx.lineWidth = 3;
        ctx.strokeRect(xB, y, photoW, photoH);
      }
    }

    // 3. Draw Footer Text
    ctx.fillStyle = frameObj.text;
    ctx.textAlign = 'center';

    // Main text
    ctx.font = `bold 32px ${frameObj.font.split(',')[0]}`;
    ctx.fillText(customText, canvasW / 2, canvasH - footerH + 60);

    // Subtext (Date)
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.font = '20px Outfit, sans-serif';
    ctx.fillText(dateStr, canvasW / 2, canvasH - footerH + 110);
  };

  // Re-draw whenever filter, frame, text, or images status change
  useEffect(() => {
    drawStrip();
  }, [selectedFilter, selectedFrame, customText, imagesLoaded]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `photobooth-${selectedFrame}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  // Basic pure JS confetti trigger
  const triggerConfetti = () => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    
    const colors = ['#ff007f', '#00f0ff', '#8b5cf6', '#10b981', '#fbbf24'];

    const createConfettiPiece = () => {
      const piece = document.createElement('div');
      piece.style.position = 'fixed';
      piece.style.zIndex = '9999';
      piece.style.width = Math.random() * 10 + 5 + 'px';
      piece.style.height = Math.random() * 10 + 5 + 'px';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-10px';
      piece.style.borderRadius = '50%';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      document.body.appendChild(piece);

      const animation = piece.animate([
        { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 2000 + 1500,
        easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
      });

      animation.onfinish = () => piece.remove();
    };

    const interval = setInterval(() => {
      if (Date.now() > animationEnd) {
        clearInterval(interval);
        return;
      }
      for (let i = 0; i < 5; i++) {
        createConfettiPiece();
      }
    }, 100);
  };

  return (
    <div className="gallery-layout">
      {/* Photo Strip Render Container */}
      <div className="strip-canvas-wrapper">
        {!imagesLoaded ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem' }}>
            <RefreshCw className="animate-spin" size={32} />
            <span>Membuat Strip Foto Anda...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            id="print-target-canvas"
            className="photobooth-strip-preview"
            style={{ width: '420px', background: '#fff' }}
          />
        )}
      </div>

      {/* Adjustments & actions sidebar */}
      <div className="gallery-sidebar">
        <div className="glass panel-section">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Kustomisasi Strip Foto
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Hias foto Anda sebelum dicetak atau disimpan.
          </p>

          {/* Text Input */}
          <div className="input-group">
            <label className="input-label">Teks Kustom</label>
            <input
              type="text"
              className="input-field"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Tulis pesan Anda..."
              maxLength={24}
            />
          </div>

          {/* Post Filter selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.25rem' }}>
            <span className="selection-title"><Wand2 size={12} /> Filter Foto</span>
            <div className="options-scroll">
              {POST_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`option-btn ${selectedFilter === f.filter ? 'selected' : ''}`}
                  onClick={() => setSelectedFilter(f.filter)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Post Frame selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.5rem' }}>
            <span className="selection-title"><Frame size={12} /> Desain Frame</span>
            <div className="options-scroll">
              {FRAMES.map((fr) => (
                <button
                  key={fr.id}
                  className={`option-btn ${selectedFrame === fr.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFrame(fr.id)}
                >
                  {fr.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="action-row">
            <button className="btn btn-primary" onClick={handleDownload} disabled={!imagesLoaded}>
              <Download size={18} /> Unduh PNG
            </button>
            <button className="btn btn-secondary" onClick={handlePrint} disabled={!imagesLoaded}>
              <Printer size={18} /> Cetak Strip
            </button>
          </div>
        </div>

        {/* Start a new booth session */}
        <div className="glass panel-section" style={{ textAlign: 'center' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Ingin mengambil foto lagi?</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Ini akan menghapus foto saat ini dan merestart studio booth untuk Anda berdua.
          </p>
          <button className="btn btn-outline" onClick={resetSession} style={{ width: '100%' }}>
            <RefreshCw size={16} /> Foto Ulang (Reset)
          </button>
        </div>
      </div>
    </div>
  );
}
