# Screen Sharing Fix — What Was Wrong and Why It Works Now

## Summary

Mobile screen sharing from Android (React Native) to the teacher's web dashboard required fixing **5 distinct issues** across the stack. No single fix would have been sufficient — all were necessary.

---

## 1. Android MediaProjection Foreground Service (Critical)

**File:** `apps/mobile/android/app/src/main/java/com/classitin/mobile/MainApplication.kt`

**Problem:** Android 10+ requires an active foreground service to use `MediaProjection` (the system API for screen capture). Without it, `getDisplayMedia()` either silently fails or throws an error. The permissions were declared in `AndroidManifest.xml`, but the **runtime flag** to actually start the service was never set.

**Fix:**
```kotlin
import com.oney.WebRTCModule.WebRTCModuleOptions

// In onCreate():
val options = WebRTCModuleOptions.getInstance()
options.enableMediaProjectionService = true
```

**Why it matters:** This is a `react-native-webrtc` requirement since version 118.0.2. The library ships a built-in `MediaProjectionService` that handles the Android foreground service lifecycle, but it's opt-in. Without this flag, the entire screen capture pipeline is dead on arrival.

---

## 2. VP8 Codec Enforcement (Critical)

**Files:**
- `apps/mobile/src/services/mediasoupClient.ts`
- `apps/web/src/services/mediasoupClient.ts`

**Problem:** Android's hardware H264 encoder for `getDisplayMedia` produces output that remote consumers can't decode — the video track arrives but renders as a **black frame**. This is a well-documented issue in the WebRTC/mediasoup ecosystem.

**Fix:** Force VP8 software codec when producing screen share tracks:
```typescript
const vp8Codec = device.rtpCapabilities.codecs?.find(
  (c) => c.mimeType.toLowerCase() === 'video/vp8'
);
const params = {
  track,
  appData: { source: 'screen' },
  ...(vp8Codec ? { codec: vp8Codec } : {}),
};
return transport.produce(params);
```

**Why it matters:** VP8 uses software encoding, which is universally compatible across all consumers. H264 hardware encoding varies by device and often produces non-standard NAL units that other decoders reject silently.

---

## 3. Infinite Join Loop Fix

**File:** `apps/mobile/src/screens/StudentSessionScreen.tsx`

**Problem:** The `useEffect` that handled `room:join` had `isConnected` as a dependency. When the socket briefly disconnected/reconnected (which happens frequently on mobile), the effect cleanup would:
1. Reset `joinedRef.current = false`
2. Call `setJoined(false)`
3. The effect re-runs, joins again
4. Cleanup fires again → infinite loop

The student could never stay in a session.

**Fix:** Split into two effects:
- **Join effect** (deps: `[isConnected, sessionId, roomId]`) — only joins if `joinedRef.current` is false. No cleanup function — so socket reconnection re-runs the effect but the guard skips it.
- **Unmount-only cleanup effect** (deps: `[]`) — only fires when the component unmounts. This is the only place that resets `joinedRef.current` and emits `room:leave`.

Added `joiningRef` to prevent duplicate join attempts while the async callback is in flight.

---

## 4. Session Event Broadcasting

**File:** `apps/server/src/controllers/sessions.controller.ts`

**Problem:** When a teacher started/ended a session via the REST API, no Socket.IO events were emitted. Students on the `RoomDetailScreen` had to manually navigate back and re-open the room to see the session state change.

**Fix:** Exposed the Socket.IO instance via `getIO()` singleton and broadcast events from the REST controller:
```typescript
const io = getIO();
io.emit('session:started', { session, roomId });
// and
io.to(`session:${sessionId}`).emit('session:ended', { sessionId, roomId });
io.emit('session:ended', { sessionId, roomId });
```

---

## 5. Consumer Key Frame + VideoRenderer Fix

**Files:**
- `apps/server/src/socket/handlers/signalingHandler.ts`
- `apps/web/src/components/media/VideoRenderer.tsx`

**Problem (server):** After `consumer.resume()`, the consumer might not receive a decodable frame until the next keyframe, which could be seconds away. The video would appear frozen or black.

**Fix:** Request a key frame immediately after resume:
```typescript
await result.consumer.resume();
await result.consumer.requestKeyFrame();
```

**Problem (web):** React StrictMode double-mounts components, causing rapid `srcObject` reassignment on `<video>` elements. The browser's `play()` call would be interrupted by the second mount's new `srcObject`, throwing `AbortError`.

**Fix:** Moved `play()` to the `onLoadedMetadata` callback (only fires when the video element has valid data) and added a `currentTrackRef` to skip redundant track assignments.

---

## 6. Stale Expo Autolinking (Build Fix)

**Problem:** The generated `PackageList.java` referenced `expo.core.ExpoModulesPackage` (old package name) instead of `expo.modules.ExpoModulesPackage` (current). This was a cached build artifact that caused compilation to fail.

**Fix:** Deleted the stale autolinking cache:
```bash
rm -rf android/build/generated/autolinking
rm -rf android/app/build/generated/autolinking
```
Then rebuilt via `npx expo run:android`, which regenerated the file with the correct import.

---

## Architecture Notes

### Screen Sharing Data Flow (Working)

```
Android Phone                    Server (mediasoup)              Teacher Browser
     │                               │                               │
     │  getDisplayMedia()             │                               │
     │  → MediaProjection service     │                               │
     │  → Screen video track          │                               │
     │                                │                               │
     │  transport.produce({           │                               │
     │    track, codec: VP8           │                               │
     │  })                            │                               │
     │  ─── RTP (VP8) ──────────────►│                               │
     │                                │  router.canConsume()          │
     │                                │  transport.consume()          │
     │                                │  ─── RTP (VP8) ─────────────►│
     │                                │                               │
     │                                │  consumer.resume()            │
     │                                │  consumer.requestKeyFrame()   │
     │                                │  ─── Key Frame ─────────────►│
     │                                │                               │
     │                                │                      <video>.srcObject
     │                                │                      onLoadedMetadata
     │                                │                      → play()
     │                                │                      → Video renders ✓
```

### Key Takeaways

1. **Android screen capture requires both manifest permissions AND runtime opt-in** — permissions alone are not enough.
2. **H264 hardware encoding is unreliable for screen share across devices** — always force VP8 for cross-device compatibility.
3. **React effect cleanup must distinguish between re-renders and unmounts** — use separate effects with appropriate dependency arrays.
4. **REST and WebSocket event systems must be coordinated** — session state changes from REST need to be broadcast via Socket.IO too.
5. **WebRTC consumers need explicit key frame requests after resume** — don't assume the producer's keyframe interval will provide timely frames.
