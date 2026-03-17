// Register WebRTC globals before anything else
import './webrtcPolyfills';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
