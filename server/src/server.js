import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { AccessToken } from 'livekit-server-sdk';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import tokenRouter from './routes/token.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure CORS for Express
app.use(cors({
    origin: ["https://whithin.ru", "https://www.whithin.ru"],
    credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/api', tokenRouter);

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

const io = new Server(server, {
    cors: {
        origin: ["https://whithin.ru", "https://www.whithin.ru"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// Log LiveKit configuration (without exposing full secret)
console.log('LiveKit configuration:', {
    url: LIVEKIT_URL,
    apiKey: LIVEKIT_API_KEY,
    secretLength: LIVEKIT_API_SECRET?.length || 0,
    secretPreview: LIVEKIT_API_SECRET ? LIVEKIT_API_SECRET.substring(0, 10) + '...' : 'missing'
});

// Store active rooms and peers
const rooms = new Map();
const peers = new Map();

// Generate access token for LiveKit
async function generateToken(roomName, participantName, identity) {
    try {
        // Validate API key and secret
        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            throw new Error('LiveKit API key or secret is missing');
        }
        
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: identity || participantName,
            name: participantName,
        });

        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        // toJwt() returns a Promise in SDK v2.x+
        const jwt = await at.toJwt();
        
        if (!jwt || typeof jwt !== 'string') {
            throw new Error('Failed to generate JWT token');
        }
        
        return jwt;
    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        throw error;
    }
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle voice activity
    socket.on('speaking', ({ speaking }) => {
        const peer = peers.get(socket.id);
        if (!peer || !socket.data?.roomId) return;

        const room = rooms.get(socket.data.roomId);
        if (!room) return;

        if (!peer.isMuted()) {
            peer.setSpeaking(speaking);
            socket.to(room.id).emit('speakingStateChanged', {
                peerId: socket.id,
                speaking: speaking && !peer.isMuted()
            });
        }
    });

    // Handle mute state
    socket.on('muteState', ({ isMuted }) => {
        const peer = peers.get(socket.id);
        if (!peer || !socket.data?.roomId) return;

        const room = rooms.get(socket.data.roomId);
        if (!room) return;

        peer.setMuted(isMuted);
        
        if (isMuted) {
            peer.setSpeaking(false);
        }

        socket.to(room.id).emit('peerMuteStateChanged', {
            peerId: socket.id,
            isMuted
        });

        if (isMuted) {
            socket.to(room.id).emit('speakingStateChanged', {
                peerId: socket.id,
                speaking: false
            });
        }
    });

    // Create or join room
    socket.on('join', async ({ roomId, name }, callback) => {
        try {
            let room = rooms.get(roomId);
            if (!room) {
                room = {
                    id: roomId,
                    peers: new Map(),
                    createdAt: Date.now()
                };
                rooms.set(roomId, room);
            }

            // Create peer
            const peer = {
                id: socket.id,
                name: name,
                socket: socket,
                roomId: roomId,
                speaking: false,
                muted: false,
                audioEnabled: true
            };
            
            peer.setMuted = (muted) => { peer.muted = muted; if (muted) peer.speaking = false; };
            peer.isMuted = () => peer.muted;
            peer.setSpeaking = (speaking) => { if (!peer.muted) peer.speaking = speaking; };
            peer.isSpeaking = () => !peer.muted && peer.speaking;
            peer.setAudioEnabled = (enabled) => { peer.audioEnabled = enabled; };
            peer.isAudioEnabled = () => peer.audioEnabled;

            peers.set(socket.id, peer);
            room.peers.set(socket.id, peer);

            socket.data.roomId = roomId;
            socket.join(roomId);

            // Get existing peers
            const existingPeers = [];
            room.peers.forEach((existingPeer) => {
                if (existingPeer.id !== socket.id) {
                    existingPeers.push({
                        id: existingPeer.id,
                        name: existingPeer.name,
                        isMuted: existingPeer.isMuted(),
                        isAudioEnabled: existingPeer.isAudioEnabled()
                    });
                }
            });

            // Generate LiveKit token (async in SDK v2.x+)
            const token = await generateToken(roomId, name, socket.id);
            
            // Debug: log token info
            console.log(`Generated token for ${name} in room ${roomId}:`, {
                tokenType: typeof token,
                tokenLength: token?.length,
                tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
            });

            // Notify other peers
            socket.to(roomId).emit('peerJoined', {
                peerId: peer.id,
                name: peer.name,
                isMuted: peer.isMuted(),
                isAudioEnabled: peer.isAudioEnabled()
            });

            console.log(`Peer ${name} (${socket.id}) joined room ${roomId}`);

            // Return external WebSocket URL for client (through nginx proxy)
            // Internal URL is ws://livekit:7880, external is wss://whithin.ru
            // Note: LiveKit client will add /rtc path automatically
            const wsUrl = process.env.LIVEKIT_EXTERNAL_URL || 'wss://whithin.ru';

            const response = {
                token: token,
                url: wsUrl,
                existingPeers: existingPeers
            };
            
            console.log('Sending response to client:', {
                hasToken: !!response.token,
                tokenType: typeof response.token,
                url: response.url,
                peersCount: response.existingPeers.length
            });

            callback(response);

        } catch (error) {
            console.error('Error in join:', error);
            callback({ error: error.message });
        }
    });

    // Handle audio state
    socket.on('audioState', ({ isEnabled }) => {
        const peer = peers.get(socket.id);
        if (peer) {
            peer.setAudioEnabled(isEnabled);
            socket.to(peer.roomId).emit('peerAudioStateChanged', {
                peerId: socket.id,
                isEnabled
            });
        }
    });

    // Handle audio disabled state
    socket.on('audioDisabledStateChanged', ({ isAudioDisabled }) => {
        if (!socket.data?.roomId) return;

        socket.to(socket.data.roomId).emit('peerAudioDisabledStateChanged', {
            peerId: socket.id,
            isAudioDisabled
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const peer = peers.get(socket.id);
        if (!peer) return;

        const room = rooms.get(socket.data?.roomId);
        if (!room) return;

        room.peers.delete(socket.id);
        peers.delete(socket.id);

        socket.to(room.id).emit('peerLeft', {
            peerId: socket.id
        });

        if (room.peers.size === 0) {
            rooms.delete(room.id);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
