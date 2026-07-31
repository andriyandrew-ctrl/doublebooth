import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

// Connect to local port 5000 in development, or the hosting domain origin in production
const SOCKET_URL = window.location.port === '5173'
  ? `http://${window.location.hostname}:5000`
  : window.location.origin;

// Helper to modify SDP and force WebRTC to use a higher video bitrate (e.g. 2.5 Mbps instead of ~500 Kbps)
function setVideoMaxBitrate(sdp, bitrate) {
  const lines = sdp.split('\r\n');
  let videoLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('m=video') === 0) {
      videoLineIndex = i;
      break;
    }
  }
  if (videoLineIndex === -1) return sdp;

  // Insert b=AS:bitrate right after the m=video line (if not already present)
  let foundBandwidth = false;
  for (let i = videoLineIndex + 1; i < lines.length; i++) {
    if (lines[i].indexOf('m=') === 0) break; // Reached next media section
    if (lines[i].indexOf('b=AS:') === 0 || lines[i].indexOf('b=TIAS:') === 0) {
      lines[i] = `b=AS:${bitrate}`;
      foundBandwidth = true;
      break;
    }
  }
  if (!foundBandwidth) {
    lines.splice(videoLineIndex + 1, 0, `b=AS:${bitrate}`);
  }
  return lines.join('\r\n');
}

export default function useWebRTC() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [users, setUsers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, failed
  
  // Shared photobooth states
  const [peerPhotos, setPeerPhotos] = useState({});
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(-1);
  const [flashActive, setFlashActive] = useState(false);
  
  // Selected overlays synced
  const [peerFilter, setPeerFilter] = useState('');
  const [peerFrame, setPeerFrame] = useState('');
  
  // WebRTC Fallback socket-based frame preview
  const [remotePreviewFrame, setRemotePreviewFrame] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
      const currentRoomCode = socketRef.current?.roomId;
      const currentNickname = socketRef.current?.nickname;
      if (currentRoomCode && currentNickname) {
        console.log(`Rejoining room ${currentRoomCode} as ${currentNickname}`);
        newSocket.emit('rejoin-room', { roomId: currentRoomCode, name: currentNickname });
      }
    });

    newSocket.on('room-created', ({ roomId, users }) => {
      setRoomCode(roomId);
      setUsers(users);
      if (socketRef.current) {
        socketRef.current.roomId = roomId;
      }
    });

    newSocket.on('room-joined', ({ roomId, users }) => {
      setRoomCode(roomId);
      setUsers(users);
      if (socketRef.current) {
        socketRef.current.roomId = roomId;
      }
    });

    newSocket.on('room-rejoined', ({ roomId, users }) => {
      setRoomCode(roomId);
      setUsers(users);
      if (socketRef.current) {
        socketRef.current.roomId = roomId;
      }
    });

    newSocket.on('peer-joined', ({ users }) => {
      setUsers(users);
      // Wait to initiate WebRTC call until both enter the Booth (cameras ready)
    });

    newSocket.on('users-updated', ({ users }) => {
      setUsers(users);
    });

    newSocket.on('peer-left', ({ users }) => {
      setUsers(users);
      setRemoteStream(null);
      setRemotePreviewFrame(null);
      setConnectionState('disconnected');
      setPeerPhotos({});
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    newSocket.on('webrtc-signal', async ({ signal, senderId }) => {
      try {
        if (!peerConnectionRef.current) {
          // If we haven't initialized our peer connection yet (User B), do it now
          createPeerConnection();
        }

        const pc = peerConnectionRef.current;

        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          answer.sdp = setVideoMaxBitrate(answer.sdp, 2500); // Force 2.5 Mbps video quality
          await pc.setLocalDescription(answer);
          newSocket.emit('webrtc-signal', { roomId: roomCode || newSocket.roomId, signal: answer });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    newSocket.on('countdown-started', () => {
      setIsCountdownRunning(true);
      setActivePhotoIndex(-1);
    });

    newSocket.on('peer-photo-shared', ({ photoIndex, dataUrl }) => {
      setPeerPhotos(prev => ({
        ...prev,
        [photoIndex]: dataUrl
      }));
    });

    newSocket.on('peer-preview-frame-shared', ({ dataUrl }) => {
      setRemotePreviewFrame(dataUrl);
    });

    newSocket.on('peer-filter-selected', ({ filterClass }) => {
      setPeerFilter(filterClass);
    });

    newSocket.on('peer-frame-selected', ({ frameClass }) => {
      setPeerFrame(frameClass);
    });

    newSocket.on('session-reset', () => {
      setPeerPhotos({});
      setRemotePreviewFrame(null);
      setIsCountdownRunning(false);
      setActivePhotoIndex(-1);
      setFlashActive(false);
    });

    newSocket.on('room-error', ({ message }) => {
      alert(message);
      leaveRoom();
    });

    return () => {
      newSocket.disconnect();
      stopCamera();
    };
  }, []);

  // Update room code reference on socket
  useEffect(() => {
    if (socketRef.current && roomCode) {
      socketRef.current.roomId = roomCode;
    }
  }, [roomCode]);

  // Request Camera access
  const startCamera = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please allow camera permissions.');
      throw err;
    }
  }, []);

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const replaceLocalStream = useCallback((newStream) => {
    if (!newStream) return;
    localStreamRef.current = newStream;
    setLocalStream(newStream);
    
    // If peer connection exists, replace the track being sent
    if (peerConnectionRef.current) {
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      const videoTrack = newStream.getVideoTracks()[0];
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
  }, []);

  // WebRTC - Create Peer Connection
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    console.log('Creating RTCPeerConnection...');
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    setConnectionState('connecting');

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && roomCode) {
        socketRef.current.emit('webrtc-signal', {
          roomId: roomCode,
          signal: event.candidate
        });
      }
    };

    // Connection state tracking
    pc.onconnectionstatechange = () => {
      console.log(`Connection state: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
    };

    // Remote stream track added
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  }, [roomCode]);

  // WebRTC - Initiate call (done by User A when User B joins)
  const initiateCall = useCallback(async () => {
    try {
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      offer.sdp = setVideoMaxBitrate(offer.sdp, 2500); // Force 2.5 Mbps video quality
      await pc.setLocalDescription(offer);

      if (socketRef.current && roomCode) {
        socketRef.current.emit('webrtc-signal', {
          roomId: roomCode,
          signal: offer
        });
      }
    } catch (err) {
      console.error('Error initiating WebRTC call:', err);
    }
  }, [createPeerConnection, roomCode]);

  // Delayed initiation: triggered when Booth mounts to guarantee local camera tracks exist on both sides
  const startVideoCall = useCallback(() => {
    const isHost = users[0] && socketRef.current && socketRef.current.id === users[0].id;
    if (isHost) {
      console.log('Host is initiating WebRTC call...');
      initiateCall();
    } else {
      console.log('Guest is preparing WebRTC peer connection...');
      createPeerConnection();
    }
  }, [initiateCall, createPeerConnection, users]);

  // Lobby actions
  const createRoom = useCallback((nickname) => {
    if (nickname === 'SINGLE_MODE') {
      setRoomCode('SINGLE');
      setUsers([{ id: 'local', name: 'You (Single Mode)', ready: false }]);
      return;
    }
    if (socketRef.current && nickname) {
      socketRef.current.nickname = nickname;
      socketRef.current.emit('create-room', { name: nickname });
    }
  }, []);

  const joinRoom = useCallback((code, nickname) => {
    if (socketRef.current && code && nickname) {
      socketRef.current.nickname = nickname;
      socketRef.current.roomId = code.toUpperCase();
      socketRef.current.emit('join-room', { roomId: code.toUpperCase(), name: nickname });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('leave-room', { roomId: roomCode });
      socketRef.current.roomId = null;
      socketRef.current.nickname = null;
    }
    setRoomCode('');
    setUsers([]);
    setRemoteStream(null);
    setConnectionState('disconnected');
    setPeerPhotos({});
    setPeerFilter('');
    setPeerFrame('');
    setIsCountdownRunning(false);
    setActivePhotoIndex(-1);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, [roomCode]);

  const toggleReady = useCallback((readyValue) => {
    if (roomCode === 'SINGLE') {
      setUsers(prev => [{ ...prev[0], ready: readyValue }]);
      return;
    }
    if (socketRef.current && roomCode) {
      socketRef.current.emit('set-ready', { roomId: roomCode, ready: readyValue });
    }
  }, [roomCode]);

  // Session actions
  const startCountdown = useCallback(() => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('start-countdown', { roomId: roomCode });
    }
  }, [roomCode]);

  const shareCapturedPhoto = useCallback((photoIndex, dataUrl) => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('share-photo', { roomId: roomCode, photoIndex, dataUrl });
    }
  }, [roomCode]);

  const sendPreviewFrame = useCallback((dataUrl) => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('share-preview-frame', { roomId: roomCode, dataUrl });
    }
  }, [roomCode]);

  const sendFilterSelection = useCallback((filterClass) => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('select-filter', { roomId: roomCode, filterClass });
    }
  }, [roomCode]);

  const sendFrameSelection = useCallback((frameClass) => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('select-frame', { roomId: roomCode, frameClass });
    }
  }, [roomCode]);

  const resetSession = useCallback(() => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('reset-session', { roomId: roomCode });
    }
  }, [roomCode]);

  return {
    socket,
    roomCode,
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
    startCamera,
    stopCamera,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startCountdown,
    shareCapturedPhoto,
    sendPreviewFrame,
    sendFilterSelection,
    sendFrameSelection,
    resetSession,
    startVideoCall,
    replaceLocalStream
  };
}
