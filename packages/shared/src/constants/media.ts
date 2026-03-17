export const SIMULCAST_ENCODINGS = [
  { rid: 'r0', maxBitrate: 150_000, scaleResolutionDownBy: 4, scalabilityMode: 'L1T3' },
  { rid: 'r1', maxBitrate: 500_000, scaleResolutionDownBy: 2, scalabilityMode: 'L1T3' },
  { rid: 'r2', maxBitrate: 1_500_000, scaleResolutionDownBy: 1, scalabilityMode: 'L1T3' },
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

/** Codec options for screen sharing producers */
export const SCREEN_CODEC_OPTIONS = {
  videoGoogleStartBitrate: 1000,
  videoGoogleMaxBitrate: 2500,
} as const;

/** Codec options for teacher (high quality, no simulcast) */
export const TEACHER_CODEC_OPTIONS = {
  videoGoogleStartBitrate: 1500,
  videoGoogleMaxBitrate: 3000,
} as const;

/** Initial preferred layer for thumbnail grid consumers */
export const THUMBNAIL_LAYER = { spatialLayer: 0, temporalLayer: 2 } as const;

/** Preferred layer for focus/HD view consumers */
export const HD_LAYER = { spatialLayer: 2, temporalLayer: 2 } as const;
