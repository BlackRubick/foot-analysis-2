// Integración con MediaPipe Tasks Vision (PoseLandmarker) para detección automática
// de cadera, rodilla y tobillo. Esta implementación asume que los assets de MediaPipe
// son accesibles vía red (CDN oficial). Puedes cambiar el baseUrl por uno propio.

import type { AnatomicalPoint } from '../../domain/biomechanics';
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface AutoDetectionResult {
  hip?: AnatomicalPoint;
  knee?: AnatomicalPoint;
  ankle?: AnatomicalPoint;
}

export interface VisionAnalyzer {
  analyzeLowerLimbFromImage: (image: HTMLImageElement | HTMLVideoElement) => Promise<AutoDetectionResult>;
}

const BASE_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest';

export class MediaPipeVisionAnalyzer implements VisionAnalyzer {
  private initialized = false;
  private landmarker: PoseLandmarker | null = null;

  private async ensureInitialized() {
    if (this.initialized) return;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `${BASE_URL}/pose_landmarker_lite.task`,
      },
      runningMode: 'IMAGE',
      numPoses: 1,
    });

    this.initialized = true;
  }

  async analyzeLowerLimbFromImage(image: HTMLImageElement | HTMLVideoElement): Promise<AutoDetectionResult> {
    await this.ensureInitialized();
    if (!this.landmarker) return {};

    const timestamp = performance.now();
    const result = 'videoWidth' in image
      ? this.landmarker.detectForVideo(image as HTMLVideoElement, timestamp)
      : this.landmarker.detect(image as HTMLImageElement);

    const landmarks = result.landmarks?.[0];
    if (!landmarks) return {};

    // Índices aproximados de MediaPipe Pose:
    // 23: right_hip, 24: left_hip, 25: right_knee, 26: left_knee, 27: right_ankle, 28: left_ankle
    const leftHip = landmarks[24];
    const leftKnee = landmarks[26];
    const leftAnkle = landmarks[28];

    if (!leftHip || !leftKnee || !leftAnkle) return {};

    const toPoint = (lm: NormalizedLandmark, label: string): AnatomicalPoint => ({
      label,
      x: lm.x,
      y: lm.y,
    });

    return {
      hip: toPoint(leftHip, 'cadera'),
      knee: toPoint(leftKnee, 'rodilla'),
      ankle: toPoint(leftAnkle, 'tobillo'),
    };
  }
}

export const mediaPipeVisionAnalyzer = new MediaPipeVisionAnalyzer();
