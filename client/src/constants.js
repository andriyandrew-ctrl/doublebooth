export const LAYOUTS = [
  { id: '1x4', name: 'Strip 1x4' },
  { id: '2x2', name: 'Grid 2x2' }
];

export const BACKGROUNDS = [
  { id: 'bg-white', name: 'Classic White', color: '#ffffff' },
  { id: 'bg-black', name: 'Dark Slate', color: '#0f172a' },
  { id: 'bg-pink', name: 'Pastel Pink', color: '#ffe4e6' },
  { id: 'bg-blue', name: 'Baby Blue', color: '#e0f2fe' },
  { id: 'bg-grid', name: 'Retro Grid', color: '#faf5ff', isGrid: true },
  { id: 'bg-cafe', name: 'Cafe (Virtual)', isImage: true },
  { id: 'bg-eiffel', name: 'Eiffel Tower (Virtual)', isImage: true },
  { id: 'bg-beach', name: 'Sunset Beach (Virtual)', isImage: true }
];

export const POST_FILTERS = [
  { id: 'normal', name: 'Original', filter: 'none' },
  { id: 'vintage-lomo', name: 'Lomo Retro', filter: 'sepia(0.3) contrast(1.3) saturate(1.6) hue-rotate(-12deg) brightness(0.95)' },
  { id: 'vintage-warm', name: 'Vintage Warm', filter: 'sepia(0.35) contrast(1.2) saturate(1.4) hue-rotate(-10deg) brightness(0.95)' },
  { id: 'retro-grayscale', name: 'Classic B&W', filter: 'grayscale(100%) contrast(1.3) brightness(0.9)' },
  { id: 'cyberpunk-cyan', name: 'Cyber Neon', filter: 'hue-rotate(180deg) saturate(2) contrast(1.1) brightness(0.95)' },
  { id: 'pastel-dream', name: 'Pastel Dream', filter: 'saturate(1.5) hue-rotate(130deg) brightness(1.1) contrast(0.9)' }
];

export const FRAMES = [
  { id: 'frame-minimal', name: 'Minimalist', text: '#1f2937', font: 'Outfit, sans-serif' },
  { id: 'frame-classic', name: 'Classic Script', text: '#1f2937', font: 'Pacifico, cursive' },
  { id: 'frame-retro', name: 'Retro Film', text: '#eab308', font: 'Courier New, monospace', isFilm: true },
  { id: 'frame-cute', name: 'Cute Hearts', text: '#e11d48', font: 'Pacifico, cursive', isCute: true }
];
