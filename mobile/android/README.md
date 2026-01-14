# Android App Integration

This directory contains instructions and example code for integrating LiveKit into an Android application.

## Setup

1. Add LiveKit Android SDK to your `build.gradle`:

```gradle
dependencies {
    implementation 'io.livekit:livekit-android:2.0.0'
    implementation 'org.webrtc:google-webrtc:1.0.32006'
}
```

2. Add required permissions to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## Example Usage

```kotlin
import livekit.LiveKit
import livekit.Room
import livekit.TrackPublication
import livekit.audio.AudioOptions
import livekit.video.VideoOptions

class VoiceChatActivity : AppCompatActivity() {
    private lateinit var room: Room
    
    private suspend fun connectToRoom(roomName: String, userName: String) {
        // Get token from your server
        val token = getTokenFromServer(roomName, userName)
        
        // Create room
        room = LiveKit.create(
            url = "wss://whithin.ru",
            token = token
        )
        
        // Connect
        room.connect()
        
        // Enable microphone
        room.localParticipant.setMicrophoneEnabled(true)
        
        // Handle remote participants
        room.addListener(object : Room.Listener {
            override fun onParticipantConnected(participant: RemoteParticipant) {
                // Handle new participant
            }
            
            override fun onTrackSubscribed(
                track: Track,
                publication: TrackPublication,
                participant: RemoteParticipant
            ) {
                // Handle new track
                if (track.kind == Track.Kind.AUDIO) {
                    // Play audio track
                } else if (track.kind == Track.Kind.VIDEO) {
                    // Display video track
                }
            }
        })
    }
    
    private suspend fun getTokenFromServer(roomName: String, userName: String): String {
        // Call your server API to get LiveKit token
        // POST https://whithin.ru/api/token
        // Body: { roomId: roomName, name: userName }
        // Response: { token: "..." }
        return ""
    }
    
    private fun toggleMute() {
        room.localParticipant.setMicrophoneEnabled(
            !room.localParticipant.isMicrophoneEnabled()
        )
    }
    
    override fun onDestroy() {
        super.onDestroy()
        room.disconnect()
    }
}
```

## Server API

Your server should provide an endpoint to generate LiveKit tokens:

```
POST /api/token
Content-Type: application/json

{
  "roomId": "room-name",
  "name": "user-name"
}

Response:
{
  "token": "eyJhbGc...",
  "url": "wss://whithin.ru"
}
```

## Resources

- [LiveKit Android SDK Documentation](https://docs.livekit.io/client-sdk-android/)
- [LiveKit Android Examples](https://github.com/livekit/client-sdk-android)
