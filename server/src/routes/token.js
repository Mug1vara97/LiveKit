import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = express.Router();

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// Generate access token for LiveKit
async function generateToken(roomName, participantName, identity) {
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
        // canPublish: true already allows all track sources, but we can explicitly specify if needed
        // canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE],
    });

    // toJwt() returns a Promise in SDK v2.x+
    return await at.toJwt();
}

// Token endpoint for mobile apps
router.post('/token', async (req, res) => {
    try {
        const { roomId, name } = req.body;

        if (!roomId || !name) {
            return res.status(400).json({ error: 'roomId and name are required' });
        }

        const token = await generateToken(roomId, name, req.body.identity || name);

        // Return external WebSocket URL for client (through nginx proxy)
        // Internal URL is ws://livekit:7880, external is wss://whithin.ru
        // Note: LiveKit client will add /rtc path automatically
        const wsUrl = process.env.LIVEKIT_EXTERNAL_URL || 'wss://whithin.ru';
        
        res.json({
            token,
            url: wsUrl
        });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

export default router;
