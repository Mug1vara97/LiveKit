# LiveKit Voice Client

React web client for LiveKit voice chat application.

## Features

- Real-time voice communication
- Screen sharing
- Modern Discord-like UI
- Responsive design

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Create a `.env` file:

```env
VITE_SERVER_URL=https://whithin.ru
VITE_LIVEKIT_WS_URL=wss://whithin.ru/rtc
```

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment Variables

- `VITE_SERVER_URL`: Server URL for Socket.IO and API calls
- `VITE_LIVEKIT_WS_URL`: LiveKit WebSocket URL (optional, will use server response if not set)

## Usage

1. Enter room name and your name
2. Click "Join Room"
3. Allow microphone access when prompted
4. Use controls to mute/unmute, share screen, or leave

## Technologies

- React 19
- Material-UI
- LiveKit Client SDK
- Socket.IO Client
- Vite
