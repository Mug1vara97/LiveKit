import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Person,
  PhoneDisabled,
  ScreenShare,
  StopScreenShare,
} from '@mui/icons-material';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, RoomOptions } from '@livekit/client';
import { io } from 'socket.io-client';
import './App.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://whithin.ru';
const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://whithin.ru/rtc';

// STUN/TURN серверы
const ICE_SERVERS = [
  {
    urls: ['stun:185.119.59.23:3478']
  },
  {
    urls: ['stun:stun.l.google.com:19302']
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
    backgroundColor: '#36393f',
    boxShadow: 'none',
    borderBottom: '1px solid #202225',
  },
  toolbar: {
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
  },
  container: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#36393f',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '8px',
    padding: '16px',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
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
    '&.speaking': {
      border: '2px solid #3ba55c',
    },
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
    marginBottom: '12px',
  },
  userName: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
  },
  bottomBar: {
    backgroundColor: '#000000',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  joinPaper: {
    backgroundColor: '#2f3136',
    color: '#dcddde',
    padding: '24px',
    maxWidth: '400px',
    margin: 'auto',
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      color: '#dcddde',
      '& fieldset': {
        borderColor: '#40444b',
      },
      '&:hover fieldset': {
        borderColor: '#72767d',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#5865f2',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#72767d',
    },
  },
  joinButton: {
    backgroundColor: '#5865f2',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#4752c4',
    },
  },
  leaveButton: {
    backgroundColor: '#dc3545',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#c82333',
    },
  },
};

function App() {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [localParticipant, setLocalParticipant] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [socket, setSocket] = useState(null);
  const videoRefs = useRef(new Map());
  const audioRefs = useRef(new Map());
  const screenShareRef = useRef(null);

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

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

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
    };

    const handleParticipantDisconnected = (participant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants((prev) => {
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
          }
        } else {
          const element = audioRefs.current.get(participant.identity);
          if (element) {
            element.srcObject = null;
          }
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
        }
      } else {
        const element = audioRefs.current.get(participant.identity);
        if (element) {
          element.srcObject = null;
        }
      }
    };

    const handleLocalTrackPublished = (publication, participant) => {
      console.log('Local track published:', publication.kind);
      if (publication.kind === 'video' && publication.source === 'screen_share') {
        setIsScreenSharing(true);
      }
    };

    const handleLocalTrackUnpublished = (publication, participant) => {
      console.log('Local track unpublished:', publication.kind);
      if (publication.kind === 'video' && publication.source === 'screen_share') {
        setIsScreenSharing(false);
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
  }, [room]);

  const joinRoom = useCallback(async () => {
    if (!roomName || !userName || !socket) return;

    try {
      // Get token from server
      const response = await new Promise((resolve, reject) => {
        socket.emit('join', { roomId: roomName, name: userName }, (data) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });

      const { token, url, existingPeers } = response;

      // Create LiveKit room with STUN/TURN configuration
      const roomOptions = getRoomOptions();
      const newRoom = new Room(roomOptions);
      // Use the WebSocket URL from server or fallback to default
      const wsUrl = url || LIVEKIT_WS_URL;
      await newRoom.connect(wsUrl, token);

      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);

      // Add existing peers
      const peersMap = new Map();
      existingPeers.forEach((peer) => {
        // Peers will be added when they connect
      });
      setParticipants(peersMap);

      // Enable camera and microphone
      await newRoom.localParticipant.enableCameraAndMicrophone();
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room: ' + error.message);
    }
  }, [roomName, userName, socket]);

  const leaveRoom = useCallback(async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setLocalParticipant(null);
      setIsConnected(false);
      setParticipants(new Map());
      setIsMuted(false);
      setIsScreenSharing(false);
      
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
    }
  }, [room]);

  const toggleMute = useCallback(async () => {
    if (!room) return;

    const audioTrack = room.localParticipant.audioTrackPublications.values().next().value;
    if (audioTrack) {
      if (isMuted) {
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
      setIsMuted(!isMuted);
      
      if (socket) {
        socket.emit('muteState', { isMuted: !isMuted });
      }
    }
  }, [room, isMuted, socket]);

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

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            {roomName}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={styles.container}>
        {isScreenSharing && screenShareRef.current && (
          <Box sx={{ mb: 2, width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <Paper sx={{ p: 2, backgroundColor: '#2B2D31' }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                Screen Share
              </Typography>
              <Box
                ref={(el) => {
                  if (el && screenShareRef.current) {
                    el.appendChild(screenShareRef.current);
                  }
                }}
                sx={{
                  width: '100%',
                  height: '400px',
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              />
            </Paper>
          </Box>
        )}

        <Box sx={styles.videoGrid}>
          {Array.from(participants.values()).map((participant) => (
            <Paper
              key={participant.identity}
              sx={styles.videoItem}
              id={`video-container-${participant.identity}`}
            >
              <Box
                id={`video-${participant.identity}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Box sx={styles.userAvatar}>
                  {getInitials(participant.name || participant.identity)}
                </Box>
                <Typography sx={styles.userName}>
                  {participant.name || participant.identity}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Container>

      <Box sx={styles.bottomBar}>
        <Box sx={styles.controlsGroup}>
          <IconButton
            onClick={toggleMute}
            sx={{
              backgroundColor: isMuted ? '#dc3545' : '#5865f2',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: isMuted ? '#c82333' : '#4752c4',
              },
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
          <IconButton
            onClick={toggleScreenShare}
            sx={{
              backgroundColor: isScreenSharing ? '#dc3545' : '#5865f2',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: isScreenSharing ? '#c82333' : '#4752c4',
              },
            }}
          >
            {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
        </Box>
        <Button
          variant="contained"
          onClick={leaveRoom}
          sx={styles.leaveButton}
          startIcon={<PhoneDisabled />}
        >
          Leave
        </Button>
      </Box>
    </Box>
  );
}

export default App;
