export const SIMULCAST_ENCODINGS = [
  { rid: 'r0', maxBitrate: 100_000, scaleResolutionDownBy: 4 },
  { rid: 'r1', maxBitrate: 300_000, scaleResolutionDownBy: 2 },
  { rid: 'r2', maxBitrate: 1_200_000, scaleResolutionDownBy: 1 },
] as const;

export const SCREEN_CAPTURE_CONSTRAINTS = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { max: 15 },
  },
  audio: false,
} as const;

export const TEACHER_SCREEN_CAPTURE_CONSTRAINTS = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { max: 30 },
  },
  audio: false,
} as const;
