import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, ImageSegmenter, FaceLandmarker } from '@mediapipe/tasks-vision';
import { BACKGROUNDS } from '../constants';

// Pre-load background images
const bgImages = {};
BACKGROUNDS.forEach(bg => {
  if (bg.isImage || bg.id.startsWith('bg-eiffel') || bg.id.startsWith('bg-cafe') || bg.id.startsWith('bg-beach')) {
    const img = new Image();
    // Assuming virtual bg IDs correspond to filenames we just created
    img.src = `/assets/backgrounds/${bg.id}.jpg`;
    bgImages[bg.id] = img;
  }
});

// Emojis for AR Filters
export const AR_FILTERS = [
  { id: 'none', name: 'Original', emoji: null },
  { id: 'bunny', name: 'Bunny Ears', emoji: '🐰', offsetX: 0, offsetY: -80, size: 100 },
  { id: 'crown', name: 'Queen Crown', emoji: '👑', offsetX: 0, offsetY: -70, size: 90 },
  { id: 'glasses', name: 'Cool Glasses', emoji: '🕶️', offsetX: 0, offsetY: 0, size: 80, anchor: 'eyes' },
  { id: 'cat', name: 'Cat Ears', emoji: '🐱', offsetX: 0, offsetY: -80, size: 90 },
  { id: 'halo', name: 'Angel Halo', emoji: '👼', offsetX: 0, offsetY: -100, size: 100 }
];

export default function useMediaPipe(rawStream, selectedBgId, selectedArFilterId) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  
  const [processedStream, setProcessedStream] = useState(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  
  const segmenterRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // Initialize Models
  useEffect(() => {
    let active = true;
    const initModels = async () => {
      try {
        console.log("Loading MediaPipe Vision Tasks...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true
        });

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 2
        });

        if (active) setIsModelsLoaded(true);
        console.log("MediaPipe Models Loaded!");
      } catch (err) {
        console.error("Failed to load MediaPipe models:", err);
      }
    };
    initModels();
    return () => { active = false; };
  }, []);

  // Setup Hidden Video and Output Canvas
  useEffect(() => {
    if (!rawStream) {
      setProcessedStream(null);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = rawStream;
    
    const canvas = document.createElement('canvas');
    // Request a 720p HD stream to match our WebRTC ideal constraints
    canvas.width = 1280;
    canvas.height = 720;
    
    videoRef.current = video;
    canvasRef.current = canvas;
    
    video.play().then(() => {
      const stream = canvas.captureStream(30);
      setProcessedStream(stream);
      startProcessingLoop();
    });

    return () => {
      video.pause();
      video.srcObject = null;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [rawStream, isModelsLoaded]); // re-run when stream or models change

  // Processing Loop
  const startProcessingLoop = () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const renderLoop = () => {
      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const startTimeMs = performance.now();

        // 1. Draw Background (Virtual or Normal)
        const isVirtualBg = selectedBgId.startsWith('bg-cafe') || selectedBgId.startsWith('bg-eiffel') || selectedBgId.startsWith('bg-beach');
        let segmentedResult = null;

        if (isVirtualBg && segmenterRef.current) {
          // Perform segmentation
          segmentedResult = segmenterRef.current.segmentForVideo(video, startTimeMs);
          
          // Draw virtual background image
          const bgImg = bgImages[selectedBgId];
          if (bgImg && bgImg.complete) {
            // Fill to cover
            const aspect = canvas.width / canvas.height;
            const imgAspect = bgImg.width / bgImg.height;
            let drawW = canvas.width, drawH = canvas.height;
            if (imgAspect > aspect) {
              drawW = canvas.height * imgAspect;
            } else {
              drawH = canvas.width / imgAspect;
            }
            ctx.drawImage(bgImg, (canvas.width - drawW)/2, (canvas.height - drawH)/2, drawW, drawH);
          } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          // Draw Segmentation Mask
          if (segmentedResult && segmentedResult.categoryMask) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            
            const mask = segmentedResult.categoryMask;
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = mask.width;
            maskCanvas.height = mask.height;
            const maskCtx = maskCanvas.getContext('2d');
            const imgData = maskCtx.createImageData(mask.width, mask.height);
            
            for (let i = 0; i < mask.getAsUint8Array().length; i++) {
                const val = mask.getAsUint8Array()[i] > 0 ? 255 : 0;
                imgData.data[i * 4 + 0] = val;
                imgData.data[i * 4 + 1] = val;
                imgData.data[i * 4 + 2] = val;
                imgData.data[i * 4 + 3] = val; 
            }
            maskCtx.putImageData(imgData, 0, 0);

            ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        } else {
          // Normal Camera
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // 2. Draw AR Face Filters
        const arFilter = AR_FILTERS.find(f => f.id === selectedArFilterId);
        if (arFilter && arFilter.emoji && faceLandmarkerRef.current) {
          const faceResult = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
          
          if (faceResult && faceResult.faceLandmarks) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (const landmarks of faceResult.faceLandmarks) {
              let anchorX, anchorY;
              
              if (arFilter.anchor === 'eyes') {
                const point = landmarks[168]; // Between eyes
                anchorX = point.x * canvas.width;
                anchorY = point.y * canvas.height;
              } else {
                const point = landmarks[10]; // Top of forehead
                anchorX = point.x * canvas.width;
                anchorY = point.y * canvas.height;
              }
              
              const leftCheek = landmarks[234];
              const rightCheek = landmarks[454];
              const faceWidth = Math.abs((rightCheek.x - leftCheek.x) * canvas.width);
              
              const scaleRatio = faceWidth / 200;
              const finalSize = arFilter.size * scaleRatio;
              
              ctx.font = `${finalSize}px Arial`;
              ctx.fillText(arFilter.emoji, anchorX + (arFilter.offsetX * scaleRatio), anchorY + (arFilter.offsetY * scaleRatio));
            }
            ctx.restore();
          }
        }
      }
      animationRef.current = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
  };

  return { processedStream, isModelsLoaded };
}
