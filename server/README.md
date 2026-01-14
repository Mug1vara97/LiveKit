# LiveKit Voice Server

Node.js server for LiveKit voice chat application.

## Features

- LiveKit token generation
- Socket.IO signaling server
- RESTful API for mobile apps
- Room management

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `LIVEKIT_URL`: LiveKit server WebSocket URL (default: ws://localhost:7880)
- `LIVEKIT_API_KEY`: LiveKit API key (default: devkey)
- `LIVEKIT_API_SECRET`: LiveKit API secret (default: secret)

## API Endpoints

### POST /api/token

Generate a LiveKit access token.

**Request:**
```json
{
  "roomId": "room-name",
  "name": "user-name",
  "identity": "optional-identity"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://whithin.ru"
}
```

## Socket.IO Events

### Client → Server

- `join`: Join a room
  ```javascript
  socket.emit('join', { roomId: 'room-name', name: 'user-name' }, callback);
  ```

- `muteState`: Update mute state
  ```javascript
  socket.emit('muteState', { isMuted: true });
  ```

- `speaking`: Update speaking state
  ```javascript
  socket.emit('speaking', { speaking: true });
  ```

- `audioState`: Update audio enabled state
  ```javascript
  socket.emit('audioState', { isEnabled: true });
  ```

### Server → Client

- `peerJoined`: New peer joined the room
- `peerLeft`: Peer left the room
- `peerMuteStateChanged`: Peer mute state changed
- `speakingStateChanged`: Peer speaking state changed
- `peerAudioStateChanged`: Peer audio state changed
