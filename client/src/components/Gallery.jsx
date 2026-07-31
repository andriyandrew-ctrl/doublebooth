import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, RefreshCw, Wand2, Frame, Palette, LayoutGrid } from 'lucide-react';

const LAYOUTS = [
  { id: '1x4', name: 'Strip 1x4' },
  { id: '2x2', name: 'Grid 2x2' }
];

const BACKGROUNDS = [
  { id: 'bg-white', name: 'Classic White', color: '#ffffff' },
  { id: 'bg-black', name: 'Dark Slate', color: '#0f172a' },
  { id: 'bg-pink', name: 'Pastel Pink', color: '#ffe4e6' },
  { id: 'bg-blue', name: 'Baby Blue', color: '#e0f2fe' },
  { id: 'bg-grid', name: 'Retro Grid', color: '#faf5ff', isGrid: true }
];

const POST_FILTERS = [
  { id: 'normal', name: 'Original', filter: 'none' },
  { id: 'vintage-lomo', name: 'Lomo Retro', filter: 'sepia(0.3) contrast(1.3) saturate(1.6) hue-rotate(-12deg) brightness(0.95)' },
  { id: 'vintage-warm', name: 'Vintage Warm', filter: 'sepia(0.35) contrast(1.2) saturate(1.4) hue-rotate(-10deg) brightness(0.95)' },
  { id: 'retro-grayscale', name: 'Classic B&W', filter: 'grayscale(100%) contrast(1.3) brightness(0.9)' },
  { id: 'cyberpunk-cyan', name: 'Cyber Neon', filter: 'hue-rotate(180deg) saturate(2) contrast(1.1) brightness(0.95)' },
  { id: 'pastel-dream', name: 'Pastel Dream', filter: 'saturate(1.5) hue-rotate(130deg) brightness(1.1) contrast(0.9)' }
];

const FRAMES = [
  { id: 'frame-minimal', name: 'Minimalist', text: '#1f2937', font: 'Outfit, sans-serif' },
  { id: 'frame-classic', name: 'Classic Script', text: '#1f2937', font: 'Pacifico, cursive' },
  { id: 'frame-retro', name: 'Retro Film', text: '#eab308', font: 'Courier New, monospace', isFilm: true },
  { id: 'frame-cute', name: 'Cute Hearts', text: '#e11d48', font: 'Pacifico, cursive', isCute: true }
];

export default function Gallery({ photoData, resetSession }) {
  const canvasRef = useRef(null);
  const [selectedLayout, setSelectedLayout] = useState('1x4');
  const [selectedBg, setSelectedBg] = useState('bg-white');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedFrame, setSelectedFrame] = useState('frame-classic');
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
    const bgObj = BACKGROUNDS.find(b => b.id === selectedBg) || BACKGROUNDS[0];
    
    // Each person's face takes a 300x400 square (so stitched slot is 600x400)
    const personW = 300;
    const personH = 400;
    const slotW = personW * 2; // 600
    const slotH = personH;     // 400
    
    const padding = 40;
    const gap = 20;
    const footerH = 150;
    
    let canvasW, canvasH;
    
    if (selectedLayout === '1x4') {
      canvasW = padding * 2 + slotW;
      canvasH = padding * 2 + (slotH * 4) + (gap * 3) + footerH;
    } else {
      // 2x2 grid
      canvasW = padding * 2 + (slotW * 2) + gap;
      canvasH = padding * 2 + (slotH * 2) + gap + footerH;
    }
    
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    // 1. Draw Background
    ctx.fillStyle = bgObj.color;
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    if (bgObj.isGrid) {
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
      ctx.lineWidth = 2;
      for (let y = 10; y < canvasH; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
      }
      for (let x = 10; x < canvasW; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
      }
    }
    
    if (frameObj.isCute) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
      ctx.font = '30px Arial';
      ctx.fillText('💖', 40, 40);
      ctx.fillText('✨', canvasW - 40, 60);
      ctx.fillText('🌸', 30, canvasH - footerH - 20);
    }

    if (frameObj.isFilm) {
       ctx.fillStyle = '#0f172a'; // black edge holes
       for (let sy = 20; sy < canvasH; sy += 60) {
         ctx.fillRect(10, sy, 15, 30);
         ctx.fillRect(canvasW - 25, sy, 15, 30);
       }
    }
    
    // 2. Draw Photos (Photo A left, Photo B right, stitched in 1 slot)
    const { photoA, photoB } = imageElementsRef.current;
    
    const drawSlot = (index, x, y) => {
      const drawCroppedPerson = (img, destX, destY) => {
        if (!img) return;
        ctx.save();
        ctx.filter = selectedFilter;
        // Crop center 3:4 portrait from whatever aspect ratio the camera gave us
        const srcW = img.height * 0.75;
        const srcX = Math.max(0, (img.width - srcW) / 2);
        ctx.drawImage(img, srcX, 0, srcW, img.height, destX, destY, personW, personH);
        ctx.restore();
      };

      // Draw Host (Left)
      drawCroppedPerson(photoA[index], x, y);
      
      // Draw Guest (Right)
      drawCroppedPerson(photoB[index], x + personW, y);

      // Draw frame border around the slot
      ctx.strokeStyle = frameObj.text;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, slotW, slotH);
      
      // Draw middle divider line
      ctx.beginPath();
      ctx.moveTo(x + personW, y);
      ctx.lineTo(x + personW, y + slotH);
      ctx.stroke();
    };
    
    if (selectedLayout === '1x4') {
      for (let i = 0; i < 4; i++) {
        drawSlot(i, padding, padding + i * (slotH + gap));
      }
    } else { // 2x2
      drawSlot(0, padding, padding);
      drawSlot(1, padding + slotW + gap, padding);
      drawSlot(2, padding, padding + slotH + gap);
      drawSlot(3, padding + slotW + gap, padding + slotH + gap);
    }
    
    // 3. Footer
    ctx.fillStyle = frameObj.text;
    ctx.textAlign = 'center';
    ctx.font = `bold 40px ${frameObj.font.split(',')[0]}`;
    ctx.fillText(customText, canvasW / 2, canvasH - footerH + 70);
    
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.font = '24px Outfit, sans-serif';
    ctx.fillText(dateStr, canvasW / 2, canvasH - footerH + 120);
  };

  // Re-draw whenever filter, frame, bg, layout, text, or images change
  useEffect(() => {
    drawStrip();
  }, [selectedFilter, selectedFrame, selectedBg, selectedLayout, customText, imagesLoaded]);

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

          {/* Layout Selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.25rem' }}>
            <span className="selection-title"><LayoutGrid size={12} /> Strip Layout</span>
            <div className="options-scroll">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  className={`option-btn ${selectedLayout === l.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLayout(l.id)}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Background Selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.25rem' }}>
            <span className="selection-title"><Palette size={12} /> Background Colors</span>
            <div className="options-scroll">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  className={`option-btn ${selectedBg === b.id ? 'selected' : ''}`}
                  onClick={() => setSelectedBg(b.id)}
                  style={{ borderLeft: `4px solid ${b.color}` }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Theme Selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.25rem' }}>
            <span className="selection-title"><Frame size={12} /> Frame Style</span>
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

          {/* Post Filter selection */}
          <div className="selection-carousel-container" style={{ marginBottom: '1.5rem' }}>
            <span className="selection-title"><Wand2 size={12} /> Camera Filters</span>
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
