# Classitin Enhancement Plan

## Current State

The app works end-to-end: auth, rooms, sessions, screen sharing between teacher/students. The architecture is solid (mediasoup, Socket.IO, Zustand, pnpm monorepo). But the experience is rough — lag in streams, screens don't fit properly, no error recovery, and the UI feels like a prototype rather than a product.

**This plan turns it into something that feels like FaceTime for classrooms.**

---

## Phase 1: Fix the Streaming (Week 1)

> The lag is NOT a UDP problem — mediasoup already uses UDP for all media. The lag comes from bad encoding settings, simulcast not being used, and no bandwidth adaptation.

### 1.1 Enable Simulcast Properly

**Problem:** Simulcast encodings are defined in shared constants but the mobile app calls `produceScreen(transport, track, false)` — simulcast is disabled. The web app enables it for students but not teachers. The server never sets preferred layers on initial consume.

**Fix:**
- Enable simulcast for ALL producers (teacher + student, web + mobile)
- Server should set initial preferred layers based on consumer context:
  - Thumbnail grid → layer 0 (320x180 @ 100kbps)
  - Focus view → layer 2 (1280x720 @ 1.2Mbps)
  - Teacher stream to students → single high-quality stream (no simulcast needed, 1:1)
- Add `scalabilityMode: 'L3T3'` to encodings for temporal layer control

**Files:** `apps/mobile/src/screens/TeacherDashboardScreen.tsx`, `apps/mobile/src/screens/StudentSessionScreen.tsx`, `apps/web/src/routes/TeacherDashboard.tsx`, `apps/web/src/routes/StudentView.tsx`, `apps/server/src/socket/handlers/signalingHandler.ts`

### 1.2 Adaptive Bitrate & Bandwidth Estimation

**Problem:** Server sets static 800kbps outgoing / 1.5Mbps incoming. No adaptation based on network quality. This causes buffering on slow connections and wastes bandwidth on fast ones.

**Fix:**
- Implement periodic `producer.getStats()` and `consumer.getStats()` polling (every 2s)
- Track packet loss, jitter, RTT per consumer
- Auto-downgrade spatial layer when packet loss > 5%
- Auto-upgrade when packet loss < 1% for 10s
- Expose stats via socket event for client-side quality indicator
- Increase max incoming bitrate to 2.5Mbps for teacher (1080p needs it)

**Files:** `apps/server/src/socket/handlers/signalingHandler.ts` (new stats loop), `apps/server/src/config/mediasoup.ts`

### 1.3 Fix Video Sizing — Aspect Ratio Handling

**Problem:** All video containers use hardcoded `aspect-video` (16:9). Screen shares can be any ratio — ultrawide monitors, portrait phones, tablets. This causes black bars or stretching.

**Fix:**
- Read actual track dimensions from `track.getSettings().width/height`
- Set container aspect ratio dynamically via CSS `aspect-ratio: w/h`
- Use `object-fit: contain` (never `cover`) for screen content — every pixel matters
- On mobile: allow pinch-to-zoom on teacher's stream
- Teacher's shared screen should fill available space while maintaining ratio

**Files:** `apps/web/src/components/media/VideoRenderer.tsx`, `apps/mobile/src/components/RTCVideoView.tsx`, all screen/dashboard components

### 1.4 Reduce First-Frame Latency

**Problem:** Consumer starts paused, then resumed, then waits for keyframe. This adds 500ms-2s delay before video appears.

**Fix:**
- Call `consumer.requestKeyFrame()` immediately on resume (already done, keep)
- Add `keyFrameRequestDelay: 0` to consumer options
- On producer side: set `videoGoogleStartBitrate: 1000` (up from 100)
- Set `videoGoogleMaxBitrate: 2500` for teacher
- Request IDR frame from producer when new consumer joins

**Files:** `apps/server/src/socket/handlers/signalingHandler.ts`, client mediasoup services

---

## Phase 2: Apple-Level UX Polish (Week 2)

### 2.1 Transitions & Animations

**Problem:** Screen changes are instant jumps. No sense of spatial continuity.

**Add:**
- **Page transitions:** Slide-in from right for forward navigation, slide-out for back (React Router + Framer Motion)
- **Session entry:** Zoom-in transition from room card into session view
- **Focus view:** Student thumbnail expands into focus view (shared layout animation)
- **Status changes:** Smooth color transitions on status badges (300ms ease)
- **Loading states:** Skeleton screens instead of spinners (room list, session join)
- **Toast notifications:** Use `sonner` for non-blocking status updates (already installed)
- **Mobile:** Use React Navigation shared element transitions

**Libraries:** `framer-motion` (web), `react-native-reanimated` (mobile)

### 2.2 Visual Hierarchy & Typography

**Problem:** Everything is the same visual weight. Headers, labels, and content blur together.

**Fix:**
- Establish clear type scale: Display (32px/bold), Title (24px/semibold), Body (16px/regular), Caption (13px/medium)
- Use opacity for secondary text (text-gray-500) not just smaller size
- Add section dividers with labels ("YOUR SCREEN", "STUDENTS", "ROSTER")
- Teacher dashboard: Make the student grid the hero — reduce chrome, maximize video space
- Student view: Teacher's screen should be 80%+ of viewport height

### 2.3 Dark Mode for Session Views

**Problem:** Bright white backgrounds are wrong for a screen-viewing context. Like watching a projector with the lights on.

**Fix:**
- Session views (TeacherDashboard, StudentView) use dark theme:
  - Background: `#0f0f0f` (near-black)
  - Cards/chrome: `#1a1a1a` with `#2a2a2a` borders
  - Text: `#e5e5e5` primary, `#a3a3a3` secondary
  - Status colors remain vivid against dark bg
- Auth/room pages stay light (they're admin, not viewing)
- Smooth transition when entering/leaving session

### 2.4 Responsive Layout Overhaul

**Problem:** Teacher dashboard cramped on small screens. Student grid doesn't adapt well. Mobile web shows "not supported" instead of being useful.

**Fix:**
- **Teacher (desktop):**
  - Default: Full-width grid with floating roster overlay (like Discord)
  - Roster slides in from right as panel, doesn't push content
  - Student grid: Auto-fill with `minmax(200px, 1fr)` — adapts to any screen
  - Focus view: Side-by-side with grid on ultrawide, overlay on narrow
- **Teacher (tablet):**
  - 2-3 column grid, bottom sheet for roster
  - Swipe up for roster
- **Student (any):**
  - Teacher stream fills 100% width, proper aspect ratio
  - Status bar as floating pill at top
  - Share button as floating action button (bottom-right)
- **Mobile app:**
  - Full-screen video with minimal chrome
  - Gesture navigation (swipe down to minimize, swipe up for controls)

### 2.5 Microinteractions

**Add:**
- Student joins: Brief pulse animation on their thumbnail in grid
- "Need Help" pressed: Thumbnail border pulses amber (visible to teacher)
- Screen share starts: Smooth expand animation from button to preview
- Focus/unfocus: Thumbnail lifts out of grid → expands to focus (shared element)
- Connection quality dot: Green/yellow/red next to each student (like FaceTime)
- Teacher share active: Subtle live border glow on teacher's preview

### 2.6 Empty States & Onboarding

**Problem:** Empty states are plain text. New users don't know what to do.

**Fix:**
- Room list empty: Illustration + "Create your first room" CTA (teacher) / "Join a room with a code" CTA (student)
- No session: "Start a session to begin monitoring" with illustration
- No students connected: "Waiting for students to join..." with animated dots
- First screen share: Tooltip explaining what students will see
- Join code: Show it prominently with a "Share with students" button (copies code + room name)

---

## Phase 3: Critical Features (Weeks 3-4)

### 3.1 Connection Resilience

**Problem:** Socket disconnect = stuck UI. No recovery.

**Fix:**
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- During reconnect: Show "Reconnecting..." banner (amber, top of screen)
- On reconnect: Re-join room, re-subscribe to all producers, restore presence
- ICE restart on transport failure (mediasoup supports this)
- If reconnect fails after 60s: Show "Connection lost" with manual retry button
- Heartbeat: ping/pong every 10s, timeout after 30s

### 3.2 Network Quality Indicator

**Problem:** No way to know if lag is your connection or the student's.

**Fix:**
- Poll `consumer.getStats()` every 3s
- Calculate: packet loss %, round-trip time, available bitrate
- Display as colored dot on each student thumbnail:
  - Green: <2% loss, <100ms RTT
  - Yellow: 2-10% loss or 100-300ms RTT
  - Red: >10% loss or >300ms RTT
- Teacher can hover for details tooltip
- Student sees their own connection quality in status bar

### 3.3 Voice Communication (Teacher ↔ Students)

**Problem:** Teacher can't give verbal instructions or have private conversations with students. Currently screen-only.

**Architecture: Three voice modes**

#### Mode 1: Broadcast (Teacher → All Students)
- Teacher taps **"Announce"** button (megaphone icon) in session controls
- Push-to-talk OR toggle — teacher chooses in settings
- Audio producer created with `appData: { source: 'audio', target: 'broadcast' }`
- Server routes to ALL consumers in the session room
- Students hear teacher through device speakers, see a **speaker icon + "Teacher is speaking"** indicator
- No student action needed — audio arrives automatically

#### Mode 2: Private (Teacher ↔ One Student)
- Teacher taps **mic icon on a student's thumbnail** (or in focus view)
- Opens a **private voice channel** between teacher and that specific student
- Implementation:
  - Teacher creates audio producer with `appData: { source: 'audio', target: 'private', targetUserId }`
  - Server creates consumer ONLY for that specific student (not broadcast to room)
  - Student's mic activates automatically (with permission prompt first time)
  - Student creates audio producer routed ONLY to teacher
  - Both sides see a **"Private call with [name]"** indicator
  - Either side can end the call
- Teacher can talk to one student while others continue working undisturbed
- Visual: Student thumbnail gets a **phone icon badge** visible only to teacher

#### Mode 3: Open Floor (Teacher → All, Students Can Respond)
- Teacher taps **"Open Discussion"** toggle
- Teacher's mic broadcasts to all (same as Mode 1)
- Students get a **"Raise Hand to Speak"** button
- Teacher sees hand-raise indicators on thumbnails
- Teacher taps a raised hand → that student's audio is unmuted to all
- Only one student can speak at a time (teacher controls who)
- Avoids classroom chaos — teacher is always the moderator

**Technical implementation:**
- Audio codec: Opus @ 48kHz mono (mediasoup already supports it)
- Add `{ mimeType: 'audio/opus', clockRate: 48000, channels: 1 }` to router codecs (already in config)
- Audio producer: `navigator.mediaDevices.getUserMedia({ audio: true, video: false })`
- Mobile: Request microphone permission on first use, cache grant
- Server routing logic in `signalingHandler.ts`:
  - On `transport:produce` with audio appData, check `target` field
  - `broadcast`: Create consumer for every peer in room
  - `private`: Create consumer only for `targetUserId`
  - `discussion`: Create consumer for all, but student audio only when teacher approves
- Echo cancellation: Enable `echoCancellation: true, noiseSuppression: true, autoGainControl: true` in getUserMedia constraints
- Mute/unmute: `producer.pause()` / `producer.resume()` (no need to recreate)

**UX details:**
- Teacher controls bar: `[🔇 Mute] [📢 Announce] [💬 Open Discussion]`
- Student thumbnail: Small mic icon overlay when in private call
- Student session view: Speaker icon pulses when teacher is talking
- Private call: Floating pill at top "🔊 Private call with Mr. Smith — Tap to end"
- All audio indicators animate smoothly (fade in/out, not instant)

**Files:** `apps/server/src/socket/handlers/signalingHandler.ts` (routing logic), `apps/server/src/mediasoup/roomManager.ts` (per-peer audio consumers), `apps/web/src/hooks/useAudio.ts` (new hook), `apps/web/src/components/teacher/VoiceControls.tsx` (new), `apps/web/src/components/student/AudioIndicator.tsx` (new), `apps/mobile/src/hooks/useAudio.ts` (new), `apps/mobile/src/components/VoiceControls.tsx` (new)

### 3.4 In-Session Chat

**Problem:** No text communication channel.

**Fix:**
- Slide-out chat panel (right side on desktop, bottom sheet on mobile)
- Teacher can send announcements (highlighted differently)
- Students can send messages (moderated — teacher can disable)
- System messages: "X joined", "X started sharing", "X needs help"
- Chat persists for session duration (in-memory, not stored)
- Unread badge on chat toggle button

### 3.5 Session Recording / Screenshot

**Problem:** No way to capture evidence of student work.

**Fix (lightweight):**
- Teacher can take a screenshot of any student's screen (canvas capture → download PNG)
- Screenshots saved with timestamp + student name
- Optional: Record focused student's stream using MediaRecorder API (client-side, saves to teacher's device)
- No server-side recording needed initially

---

## Phase 4: Mobile Excellence (Week 5)

### 4.1 Native Feel

- Haptic feedback on button presses (iOS Taptic, Android vibration)
- Pull-to-refresh with custom animation
- Swipe gestures: Back navigation, swipe between students (teacher)
- Bottom tab bar for session controls (not header buttons)
- iOS: Use `SafeAreaView` properly for notch/Dynamic Island
- Android: Material You dynamic color theming

### 4.2 Background Screen Sharing

**Problem:** Screen share stops when app goes to background on some devices.

**Fix:**
- Android: Foreground service notification "Classitin is sharing your screen"
- iOS: ReplayKit broadcast extension (already supported by react-native-webrtc)
- Handle `AppState` changes: Pause/resume producer gracefully

### 4.3 Push Notifications

- "Session started in [Room Name]" when teacher starts
- "Teacher is sharing their screen" when stream begins
- "[Student] needs help" for teacher
- Use Firebase Cloud Messaging (both platforms)

### 4.4 Offline-Capable Room List

- Cache room list locally (AsyncStorage)
- Show cached data immediately, refresh in background
- Optimistic UI for join/create operations

---

## Phase 5: Production Readiness (Week 6)

### 5.1 TURN Server

**Problem:** Current setup only works on LAN (host ICE candidates). Won't work across different networks or behind restrictive NATs/firewalls.

**Fix:**
- Deploy coturn server (or use Twilio/Xirsys TURN service)
- Add TURN credentials to mediasoup transport options
- Config: `iceServers: [{ urls: 'turn:turn.classitin.com:3478', username, credential }]`
- This makes it work from anywhere, not just same WiFi

### 5.2 Dynamic Server URL

**Problem:** Server IP is hardcoded in mobile config. Every network change requires rebuild.

**Fix:**
- Environment-based config: dev (LAN IP), staging, production URLs
- Mobile: Build variants per environment (debug uses LAN, release uses production URL)
- Web: Vite env variables (`VITE_API_URL`)

### 5.3 Horizontal Scaling

- Redis adapter for Socket.IO (multi-process)
- mediasoup pipe transports for cross-worker routing
- Database migration from SQLite to PostgreSQL
- Session affinity via load balancer

### 5.4 Monitoring & Observability

- Structured logging (already using pino)
- mediasoup stats dashboard (Grafana + Prometheus)
- Error tracking (Sentry)
- User analytics (session duration, peak concurrent, help requests)

---

## Priority Matrix

| Enhancement | Impact | Effort | Priority |
|---|---|---|---|
| Enable simulcast properly | High | Low | P0 |
| Fix video aspect ratios | High | Low | P0 |
| Reduce first-frame latency | High | Low | P0 |
| Dark mode for sessions | High | Medium | P0 |
| Connection resilience | High | Medium | P0 |
| Adaptive bitrate | High | Medium | P1 |
| Transitions & animations | Medium | Medium | P1 |
| Network quality indicator | Medium | Medium | P1 |
| Responsive layout overhaul | Medium | High | P1 |
| Voice: Broadcast (teacher → all) | High | Medium | P1 |
| Voice: Private (teacher ↔ student) | High | Medium | P1 |
| Voice: Open discussion (moderated) | Medium | High | P2 |
| In-session chat | Medium | Medium | P2 |
| Microinteractions | Low | Medium | P2 |
| Empty states | Low | Low | P2 |
| Push notifications | Medium | Medium | P2 |
| Screenshot capture | Low | Low | P2 |
| TURN server | High | Medium | P2 (prod) |
| Session recording | Low | High | P3 |
| Background sharing | Medium | High | P3 |
| Horizontal scaling | High | High | P3 (prod) |

---

## Implementation Order

```
Week 1: Streaming fixes (1.1-1.4) → immediately noticeable improvement
Week 2: UX polish (2.1-2.6) → feels like a real product
Week 3: Resilience + quality indicator (3.1-3.2) → reliable for daily use
Week 4: Voice (broadcast + private) + chat (3.3-3.4) → feature-complete for classroom use
Week 5: Mobile native feel (4.1-4.4) → App Store ready
Week 6: Production infra (5.1-5.4) → deployable at scale
```

Each phase delivers a usable, improved product. No phase depends on a later one.
