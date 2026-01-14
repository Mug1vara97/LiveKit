# iOS App Integration

This directory contains instructions and example code for integrating LiveKit into an iOS application.

## Setup

1. Add LiveKit iOS SDK via Swift Package Manager:

```
https://github.com/livekit/client-sdk-swift
```

Or via CocoaPods:

```ruby
pod 'LiveKitWebRTC', '~> 1.0'
pod 'LiveKit', '~> 2.0'
```

2. Add required permissions to `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for voice chat</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera for video chat</string>
```

## Example Usage

```swift
import LiveKit
import AVFoundation

class VoiceChatViewController: UIViewController {
    private var room: Room?
    
    func connectToRoom(roomName: String, userName: String) async throws {
        // Get token from your server
        let token = try await getTokenFromServer(roomName: roomName, userName: userName)
        
        // Create room
        let roomOptions = RoomOptions(
            defaultAudioOptions: AudioOptions(
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            )
        )
        
        let room = Room(options: roomOptions)
        
        // Set delegate
        room.add(delegate: self)
        
        // Connect
        try await room.connect(url: "wss://whithin.ru", token: token)
        
        self.room = room
        
        // Enable microphone
        try await room.localParticipant.setMicrophoneEnabled(true)
    }
    
    private func getTokenFromServer(roomName: String, userName: String) async throws -> String {
        // Call your server API to get LiveKit token
        // POST https://whithin.ru/api/token
        // Body: { roomId: roomName, name: userName }
        // Response: { token: "..." }
        return ""
    }
    
    func toggleMute() async throws {
        guard let room = room else { return }
        let isEnabled = room.localParticipant.isMicrophoneEnabled()
        try await room.localParticipant.setMicrophoneEnabled(!isEnabled)
    }
    
    deinit {
        Task {
            await room?.disconnect()
        }
    }
}

extension VoiceChatViewController: RoomDelegate {
    func room(_ room: Room, participant: RemoteParticipant, didSubscribeToTrack publication: TrackPublication) {
        // Handle new track
        if let audioTrack = publication.track as? RemoteAudioTrack {
            // Play audio track
        } else if let videoTrack = publication.track as? RemoteVideoTrack {
            // Display video track
        }
    }
    
    func room(_ room: Room, participant: RemoteParticipant, didUnsubscribeFromTrack publication: TrackPublication) {
        // Handle track unsubscribed
    }
    
    func room(_ room: Room, participant: RemoteParticipant, didConnect isReconnect: Bool) {
        // Handle participant connected
    }
    
    func room(_ room: Room, participant: RemoteParticipant, didDisconnect reason: DisconnectReason?) {
        // Handle participant disconnected
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

- [LiveKit iOS SDK Documentation](https://docs.livekit.io/client-sdk-ios/)
- [LiveKit iOS Examples](https://github.com/livekit/client-sdk-swift)
