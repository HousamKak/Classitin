// ============================================================
// Dev: use LAN IP so both TCP (signaling) and UDP (media) work.
// adb reverse only forwards TCP — mediasoup needs UDP.
// ============================================================
export const SERVER_HOST = '192.168.10.90';
export const SERVER_PORT = 3001;
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const API_BASE_URL = `${SERVER_URL}/api/v1`;
