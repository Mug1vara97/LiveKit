export default {
    server: {
        listen: {
            port: process.env.PORT || 3000
        }
    },
    livekit: {
        url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
        apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
        apiSecret: process.env.LIVEKIT_API_SECRET || 'secret'
    }
};
