// Must be imported before any mediasoup-client usage.
// Sets up global WebRTC APIs (RTCPeerConnection, MediaStream, etc.)
// that mediasoup-client depends on.
import { registerGlobals } from 'react-native-webrtc';
registerGlobals();
