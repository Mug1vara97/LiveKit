import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  PhoneDisabled,
  ScreenShare,
  StopScreenShare,
  Videocam,
  VideocamOff,
  Headset,
  HeadsetOff,
} from '@mui/icons-material';
import { Room, RoomEvent, Track } from 'livekit-client';
import '@livekit/components-styles';
import { io } from 'socket.io-client';
import './App.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://whithin.ru';
const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://whithin.ru';

// STUN/TURN серверы
const ICE_SERVERS = [
  {
    urls: ['stun:185.119.59.23:3478']
  },
  {
    urls: ['turn:185.119.59.23:3478?transport=udp'],
    username: 'test',
    credential: 'test123'
  },
  {
    urls: ['turn:185.119.59.23:3478?transport=tcp'],
    username: 'test',
    credential: 'test123'
  }
];

// Конфигурация LiveKit Room
const getRoomOptions = () => {
  return {
    rtcConfig: {
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    },
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  };
};

const styles = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#36393f',
    color: '#dcddde',
  },
  appBar: {
    backgroundColor: '#202225',
    boxShadow: 'none',
    borderBottom: '1px solid #292b2f',
  },
  toolbar: {
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    '@media (max-width: 600px)': {
      padding: '0 8px',
    }
  },
  channelName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffffff',
    '& .MuiSvgIcon-root': {
      color: '#72767d'
    },
    '@media (max-width: 600px)': {
      fontSize: '0.9rem',
    }
  },
  container: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#313338',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    '@media (max-width: 600px)': {
      padding: '8px',
    }
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '8px',
    padding: '16px',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  videoItem: {
    backgroundColor: '#2B2D31',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: '16/9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'box-shadow 0.3s ease-in-out',
    '&.speaking': {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: '2px solid #3ba55c',
        borderRadius: '8px',
        animation: 'pulse 2s infinite',
        pointerEvents: 'none',
        zIndex: 1
      }
    }
  },
  userAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#404249',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 500,
    marginBottom: '12px'
  },
  userName: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  bottomBar: {
    backgroundColor: '#000000',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  controlsContainer: {
    display: 'flex',
    gap: '16px'
  },
  controlGroup: {
    backgroundColor: '#212121',
    borderRadius: '24px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  iconButton: {
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#40444b'
    }
  },
  joinPaper: {
    backgroundColor: '#2f3136',
    color: '#dcddde',
    padding: '24px',
    maxWidth: '400px',
    margin: 'auto',
    '@media (max-width: 600px)': {
      padding: '16px',
    }
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      color: '#dcddde',
      '& fieldset': {
        borderColor: '#40444b'
      },
      '&:hover fieldset': {
        borderColor: '#72767d'
      },
      '&.Mui-focused fieldset': {
        borderColor: '#5865f2'
      }
    },
    '& .MuiInputLabel-root': {
      color: '#72767d'
    }
  },
  joinButton: {
    backgroundColor: '#5865f2',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#4752c4'
    }
  },
  leaveButton: {
    backgroundColor: '#dc3545',
    color: '#ffffff',
    borderRadius: '24px',
    padding: '8px 16px',
    minWidth: '120px',
    '&:hover': {
      backgroundColor: '#c82333'
    }
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#202225',
    '@media (max-width: 600px)': {
      padding: '4px',
      gap: '4px',
    }
  },
  fullscreenVideoContainer: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    overflow: 'hidden'
  },
  screenShareContainer: {
    position: 'relative',
    width: '100%',
    height: '300px',
    backgroundColor: '#202225',
    marginBottom: '16px',
    borderRadius: '4px',
    overflow: 'hidden'
  }
};

// Компонент VideoPlayer для отображения видео потока
const VideoPlayer = React.memo(({ stream, style }) => {
  const videoRef = useRef();
  const [isHidden, setIsHidden] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const mountedRef = useRef(true);
  const cleanupTimeoutRef = useRef(null);
  const setupAttemptRef = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    setIsHidden(false);
    setIsRemoved(false);
    setVideoError(null);

    if (!stream) {
      console.log('No stream available, cleaning up video');
      cleanupVideo();
      return;
    }

    const setupVideo = async () => {
      if (setupAttemptRef.current) {
        console.log('Setup already in progress, skipping');
        return;
      }

      if (!mountedRef.current || !videoRef.current) {
        console.log('Component not mounted or video ref not available');
        return;
      }

      try {
        setupAttemptRef.current = true;
        console.log('Setting up video with new stream');
        
        if (videoRef.current.srcObject) {
          const oldTracks = videoRef.current.srcObject.getTracks();
          oldTracks.forEach(track => {
            track.stop();
          });
          videoRef.current.srcObject = null;
          videoRef.current.load();
        }

        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          try {
            await playPromise;
            console.log('Video playback started successfully');
          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('Playback aborted, stream might have been removed');
              cleanupVideo();
              return;
            }
            throw error;
          }
        }
      } catch (error) {
        console.error('Error setting up video:', error);
        setVideoError(error.message);
        cleanupVideo();
      } finally {
        setupAttemptRef.current = false;
      }
    };

    setupVideo();

    return () => {
      console.log('Cleaning up video component');
      mountedRef.current = false;
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupVideo();
    };
  }, [stream]);

  const cleanupVideo = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        
        if (videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => {
            track.enabled = false;
            track.stop();
          });
          videoRef.current.srcObject = null;
        }
        
        videoRef.current.load();
        setIsHidden(true);

        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }
        
        cleanupTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setIsRemoved(true);
          }
        }, 100);

        setupAttemptRef.current = false;
      } catch (error) {
        console.error('Error cleaning up video:', error);
        setIsHidden(true);
        setIsRemoved(true);
        setupAttemptRef.current = false;
      }
    }
  }, []);

  if (isRemoved) {
    return null;
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: '#202225',
      borderRadius: '8px',
      overflow: 'hidden',
      opacity: isHidden ? 0 : 1,
      transition: 'opacity 0.2s ease-out'
    }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          ...(style || {})
        }}
        autoPlay
        playsInline
      />
      {videoError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: '8px 16px',
          borderRadius: '4px',
          color: '#ffffff',
          zIndex: 3
        }}>
          {videoError}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.stream === nextProps.stream && prevProps.style === nextProps.style);

// Компонент VideoOverlay для отображения информации о участнике
const VideoOverlay = React.memo(({ 
  peerName, 
  isMuted, 
  isSpeaking,
  isAudioEnabled,
  isLocal,
  onVolumeClick,
  volume,
  isAudioMuted,
  children
}) => {
  const [isVolumeOff, setIsVolumeOff] = useState(isAudioMuted || volume === 0);

  useEffect(() => {
    setIsVolumeOff(isAudioMuted || volume === 0);
  }, [volume, isAudioMuted]);

  const handleVolumeIconClick = (e) => {
    e.stopPropagation();
    setIsVolumeOff(prev => !prev);
    if (onVolumeClick) {
      onVolumeClick();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '12px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)'
    }}>
      {/* Основной блок с информацией */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 500,
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: 'fit-content',
        mb: 1
      }}>
        {isMuted ? (
          <MicOff sx={{ fontSize: 16, color: '#ed4245' }} />
        ) : isSpeaking ? (
          <Mic sx={{ fontSize: 16, color: '#3ba55c' }} />
        ) : (
          <Mic sx={{ fontSize: 16, color: '#B5BAC1' }} />
        )}
        {!isAudioEnabled && (
          <HeadsetOff sx={{ fontSize: 16, color: '#ed4245' }} />
        )}
        {peerName}
      </Box>
      
      {!isLocal && (
        <IconButton
          onClick={handleVolumeIconClick}
          className={`volumeControl ${
            isVolumeOff
              ? 'muted'
              : isSpeaking
              ? 'speaking'
              : 'silent'
          }`}
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
              transform: 'scale(1.1)'
            },
            '&.muted': {
              backgroundColor: 'rgba(237, 66, 69, 0.1) !important',
              animation: 'mutePulse 2s infinite !important',
              '&:hover': {
                backgroundColor: 'rgba(237, 66, 69, 0.2) !important',
                transform: 'scale(1.1)'
              }
            },
            '&.speaking': {
              backgroundColor: 'transparent',
              '& .MuiSvgIcon-root': {
                color: '#3ba55c'
              }
            },
            '&.silent': {
              backgroundColor: 'transparent',
              '& .MuiSvgIcon-root': {
                color: '#B5BAC1'
              }
            }
          }}
        >
          {isVolumeOff ? (
            <VolumeOff sx={{ fontSize: 20, color: '#ed4245' }} />
          ) : (
            <VolumeUp sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      )}
      
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.peerName === nextProps.peerName &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    prevProps.volume === nextProps.volume &&
    prevProps.isAudioMuted === nextProps.isAudioMuted &&
    prevProps.children === nextProps.children
  );
});

// Компонент VideoView для отображения видео с оверлеем
const VideoView = React.memo(({ 
  stream, 
  peerName, 
  isMuted, 
  isSpeaking,
  isAudioEnabled,
  isLocal,
  onVolumeClick,
  volume,
  isAudioMuted,
  children 
}) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <VideoPlayer stream={stream} />
      <VideoOverlay
        peerName={peerName}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        isAudioEnabled={isAudioEnabled}
        isLocal={isLocal}
        onVolumeClick={onVolumeClick}
        volume={volume}
        isAudioMuted={isAudioMuted}
      >
        {children}
      </VideoOverlay>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.stream === nextProps.stream &&
    prevProps.peerName === nextProps.peerName &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    prevProps.volume === nextProps.volume &&
    prevProps.isAudioMuted === nextProps.isAudioMuted &&
    prevProps.children === nextProps.children
  );
});

function App() {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [localParticipant, setLocalParticipant] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [socket, setSocket] = useState(null);
  const [volumes, setVolumes] = useState(new Map());
  const [speakingStates, setSpeakingStates] = useState(new Map());
  const [audioStates, setAudioStates] = useState(new Map());
  const [individualMutedPeers, setIndividualMutedPeers] = useState(new Map());
  
  const videoRefs = useRef(new Map());
  const audioRefs = useRef(new Map());
  const screenShareRef = useRef(null);
  const localVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodesRef = useRef(new Map());
  const analyserNodesRef = useRef(new Map());
  const animationFramesRef = useRef(new Map());

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for speaking state changes
    newSocket.on('speakingStateChanged', ({ peerId, speaking }) => {
      setSpeakingStates(prev => {
        const newStates = new Map(prev);
        newStates.set(peerId, speaking);
        return newStates;
      });
    });

    // Listen for peer mute state changes
    newSocket.on('peerMuteStateChanged', ({ peerId, isMuted }) => {
      setVolumes(prev => {
        const newVolumes = new Map(prev);
        newVolumes.set(peerId, isMuted ? 0 : 100);
        return newVolumes;
      });
      
      if (isMuted) {
        setSpeakingStates(prev => {
          const newStates = new Map(prev);
          newStates.set(peerId, false);
          return newStates;
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Initialize AudioContext for volume control
  useEffect(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });
    }

    const resumeAudioContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('AudioContext resumed successfully');
        } catch (error) {
          console.error('Failed to resume AudioContext:', error);
        }
      }
    };

    const handleInteraction = async () => {
      await resumeAudioContext();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Setup audio analysis for speaking detection
  const setupAudioAnalysis = useCallback((participantIdentity, audioElement) => {
    if (!audioContextRef.current || !audioElement) return;

    try {
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = volumes.get(participantIdentity) !== undefined 
        ? volumes.get(participantIdentity) / 100 
        : 1.0;
      
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      
      gainNodesRef.current.set(participantIdentity, gainNode);
      analyserNodesRef.current.set(participantIdentity, analyser);
      
      // Speaking detection
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkSpeaking = () => {
        if (!analyserNodesRef.current.has(participantIdentity)) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const isSpeaking = average > 30; // Threshold for speaking
        
        setSpeakingStates(prev => {
          const current = prev.get(participantIdentity);
          if (current !== isSpeaking) {
            const newStates = new Map(prev);
            newStates.set(participantIdentity, isSpeaking);
            return newStates;
          }
          return prev;
        });
        
        const frameId = requestAnimationFrame(checkSpeaking);
        animationFramesRef.current.set(participantIdentity, frameId);
      };
      
      checkSpeaking();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  }, [volumes]);

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant) => {
      console.log('Participant connected:', participant.identity);
      setParticipants((prev) => {
        const newMap = new Map(prev);
        newMap.set(participant.identity, participant);
        return newMap;
      });
      
      // Initialize states for new participant
      setVolumes(prev => {
        const newVolumes = new Map(prev);
        newVolumes.set(participant.identity, 100);
        return newVolumes;
      });
      
      setSpeakingStates(prev => {
        const newStates = new Map(prev);
        newStates.set(participant.identity, false);
        return newStates;
      });
      
      setAudioStates(prev => {
        const newStates = new Map(prev);
        newStates.set(participant.identity, true);
        return newStates;
      });
      
      setIndividualMutedPeers(prev => {
        const newMap = new Map(prev);
        newMap.set(participant.identity, false);
        return newMap;
      });
      
      // Subscribe to all published tracks of the new participant immediately
      // This ensures all existing participants can see/hear the new participant
      participant.trackPublications.forEach((publication) => {
        if (publication.kind === 'audio' || publication.kind === 'video') {
          if (publication.isSubscribed && publication.track) {
            // Track is already subscribed, handle it immediately
            const track = publication.track;
            console.log('New participant has subscribed track:', publication.kind, participant.identity);
            
            if (track.kind === 'audio') {
              const element = document.createElement('audio');
              element.autoplay = true;
              audioRefs.current.set(participant.identity, element);
              element.srcObject = new MediaStream([track.mediaStreamTrack]);
              console.log('Attached new participant audio track for:', participant.identity);
              
              // Setup audio analysis
              setupAudioAnalysis(participant.identity, element);
            } else if (track.kind === 'video') {
              // Handle video track immediately
              const element = document.createElement('video');
              element.autoplay = true;
              element.playsInline = true;
              videoRefs.current.set(participant.identity, element);
              const container = document.getElementById(`video-${participant.identity}`);
              if (container) {
                container.appendChild(element);
                element.srcObject = new MediaStream([track.mediaStreamTrack]);
                console.log('Attached new participant video track for:', participant.identity);
              }
            }
          } else if (publication.trackSid && !publication.isSubscribed) {
            // Explicitly subscribe to the track
            // In LiveKit JS SDK, subscription is usually automatic, but we can set it explicitly
            if (publication.setSubscribed) {
              publication.setSubscribed(true);
              console.log('Subscribing to new participant track:', publication.kind, publication.trackSid);
            } else {
              // If setSubscribed is not available, LiveKit will auto-subscribe
              console.log('Track will be auto-subscribed:', publication.kind, publication.trackSid);
            }
          }
        }
      });
      
      // Also subscribe to tracks that may be published later (e.g., after microphone/camera is enabled)
      participant.on('trackPublished', (publication) => {
        if ((publication.kind === 'audio' || publication.kind === 'video') && publication.trackSid) {
          // In LiveKit JS SDK, subscription is usually automatic, but we can set it explicitly
          if (publication.setSubscribed) {
            publication.setSubscribed(true);
            console.log('Subscribing to newly published track:', publication.kind, publication.trackSid);
          } else {
            // If setSubscribed is not available, LiveKit will auto-subscribe
            console.log('Track will be auto-subscribed:', publication.kind, publication.trackSid);
          }
        }
      });
    };

    const handleParticipantDisconnected = (participant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants((prev) => {
        const newMap = new Map(prev);
        newMap.delete(participant.identity);
        return newMap;
      });
      
      // Cleanup audio analysis
      if (animationFramesRef.current.has(participant.identity)) {
        cancelAnimationFrame(animationFramesRef.current.get(participant.identity));
        animationFramesRef.current.delete(participant.identity);
      }
      gainNodesRef.current.delete(participant.identity);
      analyserNodesRef.current.delete(participant.identity);
      
      setVolumes(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.identity);
        return newMap;
      });
      
      setSpeakingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.identity);
        return newMap;
      });
      
      setAudioStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.identity);
        return newMap;
      });
      
      setIndividualMutedPeers(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.identity);
        return newMap;
      });
    };

    const handleTrackSubscribed = (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, participant.identity);
      
      if (track.kind === 'video') {
        const element = document.createElement('video');
        element.autoplay = true;
        element.playsInline = true;
        
        if (publication.source === 'screen_share') {
          screenShareRef.current = element;
          if (screenShareRef.current?.parentElement) {
            screenShareRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
          }
        } else {
          videoRefs.current.set(participant.identity, element);
          const container = document.getElementById(`video-${participant.identity}`);
          if (container) {
            container.appendChild(element);
            element.srcObject = new MediaStream([track.mediaStreamTrack]);
          }
        }
      } else if (track.kind === 'audio') {
        const element = document.createElement('audio');
        element.autoplay = true;
        audioRefs.current.set(participant.identity, element);
        element.srcObject = new MediaStream([track.mediaStreamTrack]);
        
        // Setup audio analysis for speaking detection
        setupAudioAnalysis(participant.identity, element);
      }

      track.on('ended', () => {
        if (track.kind === 'video') {
          if (publication.source === 'screen_share') {
            if (screenShareRef.current) {
              screenShareRef.current.srcObject = null;
            }
          } else {
            const element = videoRefs.current.get(participant.identity);
            if (element) {
              element.srcObject = null;
              element.remove();
            }
            videoRefs.current.delete(participant.identity);
          }
        } else {
          const element = audioRefs.current.get(participant.identity);
          if (element) {
            element.srcObject = null;
          }
          audioRefs.current.delete(participant.identity);
          
          // Cleanup audio analysis
          if (animationFramesRef.current.has(participant.identity)) {
            cancelAnimationFrame(animationFramesRef.current.get(participant.identity));
            animationFramesRef.current.delete(participant.identity);
          }
          gainNodesRef.current.delete(participant.identity);
          analyserNodesRef.current.delete(participant.identity);
        }
      });
    };

    const handleTrackUnsubscribed = (track, publication, participant) => {
      console.log('Track unsubscribed:', track.kind, participant.identity);
      
      if (track.kind === 'video') {
        if (publication.source === 'screen_share') {
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = null;
          }
        } else {
          const element = videoRefs.current.get(participant.identity);
          if (element) {
            element.srcObject = null;
            element.remove();
          }
          videoRefs.current.delete(participant.identity);
        }
      } else {
        const element = audioRefs.current.get(participant.identity);
        if (element) {
          element.srcObject = null;
        }
        audioRefs.current.delete(participant.identity);
        
        // Cleanup audio analysis
        if (animationFramesRef.current.has(participant.identity)) {
          cancelAnimationFrame(animationFramesRef.current.get(participant.identity));
          animationFramesRef.current.delete(participant.identity);
        }
        gainNodesRef.current.delete(participant.identity);
        analyserNodesRef.current.delete(participant.identity);
      }
    };

    const handleLocalTrackPublished = (publication, participant) => {
      console.log('Local track published:', publication.kind, publication.source);
      if (publication.kind === 'video') {
        if (publication.source === 'screen_share') {
          setIsScreenSharing(true);
        } else if (publication.track) {
          setIsVideoEnabled(true);
          // Handle local camera video
          const track = publication.track;
          const element = document.createElement('video');
          element.autoplay = true;
          element.playsInline = true;
          element.muted = true; // Mute local video to avoid feedback
          localVideoRef.current = element;
          const container = document.getElementById('local-video');
          if (container) {
            container.appendChild(element);
            element.srcObject = new MediaStream([track.mediaStreamTrack]);
          }
        }
      }
    };

    const handleLocalTrackUnpublished = (publication, participant) => {
      console.log('Local track unpublished:', publication.kind);
      if (publication.kind === 'video') {
        if (publication.source === 'screen_share') {
          setIsScreenSharing(false);
        } else {
          setIsVideoEnabled(false);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.remove();
            localVideoRef.current = null;
          }
        }
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    };
  }, [room, setupAudioAnalysis]);

  // Update volume when volumes state changes
  useEffect(() => {
    gainNodesRef.current.forEach((gainNode, participantIdentity) => {
      const volume = volumes.get(participantIdentity);
      if (gainNode && volume !== undefined) {
        gainNode.gain.value = volume / 100;
      }
    });
  }, [volumes]);

  const joinRoom = useCallback(async () => {
    if (!roomName || !userName || !socket) return;

    try {
      // Get token from server
      const response = await new Promise((resolve, reject) => {
        socket.emit('join', { roomId: roomName, name: userName }, (data) => {
          console.log('Received response from server:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            tokenType: data?.token ? typeof data.token : 'undefined',
            tokenValue: data?.token ? (typeof data.token === 'string' ? data.token.substring(0, 30) + '...' : String(data.token)) : 'missing',
            url: data?.url,
            hasError: !!data?.error
          });
          
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });

      console.log('Response parsed:', {
        hasToken: !!response.token,
        tokenType: typeof response.token,
        tokenValue: response.token ? (typeof response.token === 'string' ? response.token.substring(0, 30) + '...' : String(response.token)) : 'missing',
        url: response.url,
        peersCount: response.existingPeers?.length
      });

      const { token, url, existingPeers } = response;

      // Ensure token is a string
      if (!token || typeof token !== 'string') {
        console.error('Token validation failed:', {
          token,
          tokenType: typeof token,
          tokenIsNull: token === null,
          tokenIsUndefined: token === undefined
        });
        throw new Error('Invalid token received from server');
      }

      // Create LiveKit room with STUN/TURN configuration
      const roomOptions = getRoomOptions();
      const newRoom = new Room(roomOptions);
      // Use the WebSocket URL from server or fallback to default
      const wsUrl = url || LIVEKIT_WS_URL;
      console.log('Connecting to LiveKit:', { wsUrl, tokenLength: token.length });
      await newRoom.connect(wsUrl, token);

      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);

      // Add existing remote participants and subscribe to their tracks
      const participantsMap = new Map();
      newRoom.remoteParticipants.forEach((participant) => {
        console.log('Found existing participant:', participant.identity);
        participantsMap.set(participant.identity, participant);
        
        // Initialize states
        setVolumes(prev => {
          const newVolumes = new Map(prev);
          newVolumes.set(participant.identity, 100);
          return newVolumes;
        });
        
        setSpeakingStates(prev => {
          const newStates = new Map(prev);
          newStates.set(participant.identity, false);
          return newStates;
        });
        
        setAudioStates(prev => {
          const newStates = new Map(prev);
          newStates.set(participant.identity, true);
          return newStates;
        });
        
        setIndividualMutedPeers(prev => {
          const newMap = new Map(prev);
          newMap.set(participant.identity, false);
          return newMap;
        });
        
        // Subscribe to all published tracks of existing participants
        // This ensures new participants can see/hear all existing participants
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === 'audio' || publication.kind === 'video') {
            // If track is already subscribed, handle it immediately
            if (publication.isSubscribed && publication.track) {
              const track = publication.track;
              console.log('Existing participant has subscribed track:', publication.kind, participant.identity);
              
              if (track.kind === 'audio') {
                // Attach audio track immediately
                const element = document.createElement('audio');
                element.autoplay = true;
                audioRefs.current.set(participant.identity, element);
                element.srcObject = new MediaStream([track.mediaStreamTrack]);
                console.log('Attached existing audio track for:', participant.identity);
                
                // Setup audio analysis
                setupAudioAnalysis(participant.identity, element);
              } else if (track.kind === 'video') {
                // Attach video track immediately
                const element = document.createElement('video');
                element.autoplay = true;
                element.playsInline = true;
                videoRefs.current.set(participant.identity, element);
                const container = document.getElementById(`video-${participant.identity}`);
                if (container) {
                  container.appendChild(element);
                  element.srcObject = new MediaStream([track.mediaStreamTrack]);
                  console.log('Attached existing video track for:', participant.identity);
                }
              }
            } else if (publication.trackSid && !publication.isSubscribed) {
              // Explicitly subscribe to the track if not already subscribed
              // In LiveKit JS SDK, subscription is usually automatic, but we can set it explicitly
              if (publication.setSubscribed) {
                publication.setSubscribed(true);
                console.log('Subscribing to existing track:', publication.kind, publication.trackSid);
              } else {
                // If setSubscribed is not available, LiveKit will auto-subscribe
                console.log('Track will be auto-subscribed:', publication.kind, publication.trackSid);
              }
            }
          }
        });
      });
      setParticipants(participantsMap);

      // Enable microphone only (camera disabled by default)
      await newRoom.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room: ' + error.message);
    }
  }, [roomName, userName, socket, setupAudioAnalysis]);

  const leaveRoom = useCallback(async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setLocalParticipant(null);
      setIsConnected(false);
      setParticipants(new Map());
      setIsMuted(false);
      setIsScreenSharing(false);
      setIsVideoEnabled(false);
      
      // Clean up video elements
      videoRefs.current.forEach((element) => {
        element.srcObject = null;
        element.remove();
      });
      videoRefs.current.clear();
      
      audioRefs.current.forEach((element) => {
        element.srcObject = null;
      });
      audioRefs.current.clear();

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.remove();
        localVideoRef.current = null;
      }
      
      // Cleanup audio analysis
      animationFramesRef.current.forEach(frameId => cancelAnimationFrame(frameId));
      animationFramesRef.current.clear();
      gainNodesRef.current.clear();
      analyserNodesRef.current.clear();
    }
  }, [room]);

  const toggleMute = useCallback(async () => {
    if (!room) return;

    try {
      const newMutedState = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      
      if (socket) {
        socket.emit('muteState', { isMuted: newMutedState });
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [room, isMuted, socket]);

  const toggleVideo = useCallback(async () => {
    if (!room) return;

    try {
      const newVideoState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newVideoState);
      setIsVideoEnabled(newVideoState);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }, [room, isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!room) return;

    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [room, isScreenSharing]);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
    
    // Mute/unmute all remote audio
    gainNodesRef.current.forEach((gainNode) => {
      if (gainNode) {
        gainNode.gain.value = isAudioEnabled ? 0 : 1;
      }
    });
    
    if (socket) {
      socket.emit('audioState', { isEnabled: !isAudioEnabled });
    }
  }, [isAudioEnabled, socket]);

  const handleVolumeChange = useCallback((participantIdentity) => {
    setIndividualMutedPeers(prev => {
      const newMap = new Map(prev);
      const isMuted = !(newMap.get(participantIdentity) || false);
      newMap.set(participantIdentity, isMuted);
      
      // Update volume
      setVolumes(prevVolumes => {
        const newVolumes = new Map(prevVolumes);
        newVolumes.set(participantIdentity, isMuted ? 0 : 100);
        return newVolumes;
      });
      
      return newMap;
    });
  }, []);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getParticipantName = (participant) => {
    return participant.name || participant.identity;
  };

  const getParticipantStream = (participantIdentity) => {
    const videoElement = videoRefs.current.get(participantIdentity);
    if (videoElement && videoElement.srcObject) {
      return videoElement.srcObject;
    }
    return null;
  };

  if (!isConnected) {
    return (
      <Box sx={styles.root}>
        <Container sx={styles.container}>
          <Paper sx={styles.joinPaper}>
            <Typography variant="h5" gutterBottom sx={{ color: '#ffffff', mb: 3 }}>
              Join Voice Room
            </Typography>
            <TextField
              fullWidth
              label="Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              sx={styles.textField}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Your Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              sx={styles.textField}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={joinRoom}
              sx={styles.joinButton}
              disabled={!roomName || !userName}
              style={{ marginTop: '16px' }}
            >
              Join Room
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={styles.root}>
      <AppBar position="static" sx={styles.appBar}>
        <Toolbar sx={styles.toolbar}>
          <Box sx={styles.channelName}>
            <Typography variant="h6">
              {roomName}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container sx={styles.container}>
        {isScreenSharing && screenShareRef.current && (
          <Box sx={styles.screenShareContainer}>
            <Box
              ref={(el) => {
                if (el && screenShareRef.current) {
                  el.appendChild(screenShareRef.current);
                }
              }}
              sx={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            />
          </Box>
        )}

        <Box sx={styles.videoGrid}>
          {/* Local participant */}
          {localParticipant && (
            <Box 
              key={localParticipant.identity} 
              sx={styles.videoItem} 
              className={speakingStates.get(localParticipant.identity) ? 'speaking' : ''}
            >
              {isVideoEnabled && localVideoRef.current ? (
                <VideoView 
                  stream={localVideoRef.current?.srcObject}
                  peerName={userName || getParticipantName(localParticipant)}
                  isMuted={isMuted}
                  isSpeaking={speakingStates.get(localParticipant.identity) || false}
                  isAudioEnabled={isAudioEnabled}
                  isLocal={true}
                  isAudioMuted={isMuted}
                />
              ) : (
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Box sx={styles.userAvatar}>
                    {getInitials(userName || getParticipantName(localParticipant))}
                  </Box>
                  <VideoOverlay
                    peerName={userName || getParticipantName(localParticipant) + ' (You)'}
                    isMuted={isMuted}
                    isSpeaking={speakingStates.get(localParticipant.identity) || false}
                    isAudioEnabled={isAudioEnabled}
                    isLocal={true}
                    isAudioMuted={isMuted}
                  />
                </div>
              )}
            </Box>
          )}

          {/* Remote participants */}
          {Array.from(participants.values()).map((participant) => {
            const hasVideo = videoRefs.current.has(participant.identity);
            const videoStream = getParticipantStream(participant.identity);
            const isSpeaking = speakingStates.get(participant.identity) || false;
            const isMutedPeer = participant.isMuted || false;
            const isAudioEnabledPeer = audioStates.get(participant.identity) !== false;
            const volume = volumes.get(participant.identity) || 100;
            const isAudioMuted = individualMutedPeers.get(participant.identity) || false;
            
            return (
              <Box 
                key={participant.identity} 
                sx={styles.videoItem} 
                className={isSpeaking ? 'speaking' : ''}
                id={`video-container-${participant.identity}`}
              >
                {hasVideo && videoStream ? (
                  <VideoView
                    stream={videoStream}
                    peerName={getParticipantName(participant)}
                    isMuted={isMutedPeer}
                    isSpeaking={isSpeaking}
                    isAudioEnabled={isAudioEnabledPeer}
                    isLocal={false}
                    onVolumeClick={() => handleVolumeChange(participant.identity)}
                    volume={volume}
                    isAudioMuted={isAudioMuted}
                  />
                ) : (
                  <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Box sx={styles.userAvatar}>
                      {getInitials(getParticipantName(participant))}
                    </Box>
                    <VideoOverlay
                      peerName={getParticipantName(participant)}
                      isMuted={isMutedPeer}
                      isSpeaking={isSpeaking}
                      isAudioEnabled={isAudioEnabledPeer}
                      isLocal={false}
                      onVolumeClick={() => handleVolumeChange(participant.identity)}
                      volume={volume}
                      isAudioMuted={isAudioMuted}
                    />
                  </div>
                )}
              </Box>
            );
          })}
        </Box>
      </Container>

      <Box sx={styles.bottomBar}>
        <Box sx={styles.controlsContainer}>
          <Box sx={styles.controlGroup}>
            <IconButton
              sx={styles.iconButton}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>
            <IconButton
              sx={styles.iconButton}
              onClick={toggleVideo}
              title={isVideoEnabled ? "Stop camera" : "Start camera"}
            >
              {isVideoEnabled ? <VideocamOff /> : <Videocam />}
            </IconButton>
            <IconButton
              sx={styles.iconButton}
              onClick={toggleAudio}
              title={isAudioEnabled ? "Disable audio output" : "Enable audio output"}
            >
              {isAudioEnabled ? <Headset /> : <HeadsetOff />}
            </IconButton>
          </Box>
          <Box sx={styles.controlGroup}>
            <IconButton
              sx={styles.iconButton}
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
            </IconButton>
          </Box>
        </Box>
        <Button
          variant="contained"
          sx={styles.leaveButton}
          onClick={leaveRoom}
          startIcon={<PhoneDisabled />}
        >
          Leave
        </Button>
      </Box>
    </Box>
  );
}

export default App;
