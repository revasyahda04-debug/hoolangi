export const APP_CONFIG = {
  questionsPerPlayer: 10,
  pointsPerCorrect: 10,
  answerTransitionDelayMs: 2200,
  inferenceIntervalMs: 34,
  handLostCancelMs: 550,
  cursorSmoothing: 0.42,
  pinch: {
    engageRatio: 0.38,
    releaseRatio: 0.52,
    debounceMs: 65
  },
  dropSnapRadiusPx: 92,
  mediapipe: {
    wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
    modelUrl:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
  }
} as const;
