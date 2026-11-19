import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

let visionTasksPromise: Promise<{ faceLandmarker: FaceLandmarker; poseLandmarker: PoseLandmarker }> | null = null;
let cachedVisionTasks: { faceLandmarker: FaceLandmarker; poseLandmarker: PoseLandmarker } | null = null;

export const resetVisionTasksCacheForTesting = () => {
  if (cachedVisionTasks) {
    try {
      cachedVisionTasks.faceLandmarker?.close();
      cachedVisionTasks.poseLandmarker?.close();
    } catch {}
  }
  visionTasksPromise = null;
  cachedVisionTasks = null;
};

export const preloadVisionTasks = async (): Promise<{
  faceLandmarker: FaceLandmarker;
  poseLandmarker: PoseLandmarker;
}> => {
  if (cachedVisionTasks) {
    return cachedVisionTasks;
  }
  if (!visionTasksPromise) {
    visionTasksPromise = (async () => {
      const visionModule = await import('@mediapipe/tasks-vision');
      let vision: Awaited<ReturnType<typeof visionModule.FilesetResolver.forVisionTasks>>;
      try {
        vision = await visionModule.FilesetResolver.forVisionTasks('/wasm');
      } catch {
        vision = await visionModule.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'
        );
      }

      const [faceLandmarker, poseLandmarker] = await Promise.all([
        visionModule.FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        }),
        visionModule.PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
      ]);

      cachedVisionTasks = { faceLandmarker, poseLandmarker };
      return cachedVisionTasks;
    })().catch((err) => {
      visionTasksPromise = null;
      throw err;
    });
  }
  return visionTasksPromise;
};

export function useMediaPipeTracking() {
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const trackingFrameRef = useRef<FrameRequestCallback | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const runRef = useRef(false);
  const previousHandsRef = useRef<{ leftX: number; leftY: number; rightX: number; rightY: number } | null>(null);
  const lastGestureAtRef = useRef(0);
  const postureSamplesRef = useRef<number[]>([]);
  const eyeSamplesRef = useRef<number[]>([]);
  const faceMissingFramesRef = useRef(0);
  const targetPoseRef = useRef<Array<{ x: number; y: number; z?: number; visibility?: number }> | null>(null);
  const smoothedPoseRef = useRef<Array<{ x: number; y: number; z?: number; visibility?: number }> | null>(null);

  const [voiceLevel, setVoiceLevel] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(0);
  const [eyeContact, setEyeContact] = useState(0);
  const [posture, setPosture] = useState(0);
  const [cameraGuidance, setCameraGuidance] = useState('Đang tìm khuôn mặt…');
  const [, setGestureCount] = useState(0);
  const [, setGestureFeedback] = useState('Đang phân tích cử chỉ…');
  const [faceMissing, setFaceMissing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const showSkeletonRef = useRef(showSkeleton);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

  const resetTrackingMetrics = () => {
    setFaceMissing(false);
    faceMissingFramesRef.current = 0;
    previousHandsRef.current = null;
    targetPoseRef.current = null;
    smoothedPoseRef.current = null;
    postureSamplesRef.current = [];
    eyeSamplesRef.current = [];
    setGestureCount(0);
    setTrackingError('');
  };

  const initVisionTasks = async () => {
    const tasks = await preloadVisionTasks();
    faceLandmarkerRef.current = tasks.faceLandmarker;
    poseLandmarkerRef.current = tasks.poseLandmarker;
    return tasks;
  };

  const startPerformanceTracking = ({
    video,
    faceLandmarker,
    poseLandmarker,
    analyser,
    transcriptRef,
    onAutoFinish,
    onTickSeconds,
  }: {
    video: HTMLVideoElement | React.RefObject<HTMLVideoElement | null>;
    faceLandmarker: FaceLandmarker;
    poseLandmarker: PoseLandmarker;
    analyser: AnalyserNode;
    transcriptRef: React.MutableRefObject<string>;
    onAutoFinish?: () => void;
    onTickSeconds?: (seconds: number) => void;
  }) => {
    runRef.current = true;
    startedAtRef.current = performance.now();
    elapsedBeforePauseRef.current = 0;

    let lastVisionRun = 0;
    let lastAudioRun = 0;
    let previousTimestamp = 0;
    let lastVideoTime = -1;
    let lastWords = transcriptRef.current ? transcriptRef.current.split(/\s+/).length : 0;
    const wordSamples: Array<{ at: number; count: number }> = [{ at: performance.now(), count: lastWords }];
    const samples = new Uint8Array(analyser.frequencyBinCount);

    const trackPerformance = (now: number) => {
      if (!runRef.current) return;

      const videoEl = ('current' in video) ? video.current : video;

      // 1. Audio analysis & session timer (every ~120ms)
      if (now - lastAudioRun >= 120) {
        lastAudioRun = now;
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
          const diff = samples[i] - 128;
          sumSquares += diff * diff;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const nextVoiceLevel = Math.min(100, Math.round(rms * 1.8));
        setVoiceLevel((prev) => (Math.abs(prev - nextVoiceLevel) >= 2 ? nextVoiceLevel : prev));

        const elapsed = elapsedBeforePauseRef.current + Math.floor((performance.now() - (startedAtRef.current ?? performance.now())) / 1000);
        onTickSeconds?.(elapsed);

        // Auto-finish when reaching 15 minutes limit (900 seconds)
        if (elapsed >= 900) {
          onAutoFinish?.();
          return;
        }
        const currentWords = transcriptRef.current ? transcriptRef.current.split(/\s+/).length : 0;
        if (currentWords !== lastWords) {
          lastWords = currentWords;
          wordSamples.push({ at: performance.now(), count: currentWords });
        }
        const cutoff = performance.now() - 12_000;
        while (wordSamples.length > 2 && wordSamples[1].at < cutoff) wordSamples.shift();
        const oldestSample = wordSamples[0];
        const sampleDuration = performance.now() - oldestSample.at;
        if (sampleDuration >= 1_000) {
          const measuredWords = Math.max(0, currentWords - oldestSample.count);
          setWordsPerMinute(Math.round((measuredWords * 60_000) / sampleDuration));
        }
      }

      // 2. Vision Task Detection (every ~50ms, ~20 FPS)
      const isVideoAdvancing =
        videoEl &&
        videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0 &&
        !videoEl.paused &&
        videoEl.currentTime !== lastVideoTime;

      if (isVideoAdvancing) {
        if (now - lastVisionRun >= 50 && now - previousTimestamp >= 30) {
          lastVisionRun = now;
          previousTimestamp = now;
          lastVideoTime = videoEl.currentTime;
          try {
            const faceResult = faceLandmarker.detectForVideo(videoEl, now);
            const landmarks = faceResult.faceLandmarks[0];
            if (landmarks?.length) {
              faceMissingFramesRef.current = 0;
              setFaceMissing(false);
              // Leverage MediaPipe anatomical facial landmarks (1: nose tip, 234: right temple, 454: left temple, 10: forehead, 152: chin)
              const noseTip = landmarks[1];
              const rightTemple = landmarks[234];
              const leftTemple = landmarks[454];
              const forehead = landmarks[10];
              const chin = landmarks[152];

              const matrix = faceResult.facialTransformationMatrixes?.[0]?.data;

              // Calculate face dimensions using both width and height to prevent yaw distortion
              const faceHeight = (forehead && chin) ? Math.abs(chin.y - forehead.y) : 0.35;
              const rawWidth = (rightTemple && leftTemple) ? Math.abs(leftTemple.x - rightTemple.x) : 0.25;
              // Use max to ensure turning head left/right does not falsely shrink perceived face distance
              const effectiveFaceSize = Math.max(rawWidth, faceHeight * 0.72);

              const faceCenterX = noseTip ? noseTip.x : 0.5;
              const faceCenterY = (forehead && chin) ? (forehead.y + chin.y) / 2 : (noseTip?.y ?? 0.45);

              // 1. Metric 3D Depth Distance via MediaPipe Facial Transformation Matrix (in centimeters)
              let isTooClose = false;
              let isTooFar = false;

              if (matrix && matrix.length >= 16 && Math.abs(matrix[14]) > 5) {
                // m[14] is Tz (distance from camera in cm; negative in right-handed camera space)
                const zDistanceCm = Math.abs(matrix[14]);
                isTooClose = zDistanceCm < 38;
                isTooFar = zDistanceCm > 95;
              } else {
                // Robust 2D fallback: evaluated using aspect-ratio independent effective size
                isTooClose = effectiveFaceSize > 0.40;
                isTooFar = effectiveFaceSize < 0.14;
              }

              const nextGuidance =
                faceCenterX < 0.28 || faceCenterX > 0.72 || faceCenterY < 0.12 || faceCenterY > 0.78
                  ? 'Đưa khuôn mặt vào giữa khung'
                  : isTooClose
                  ? 'Hơi gần — lùi ra một chút'
                  : isTooFar
                  ? 'Hơi xa — tiến lại gần'
                  : 'Vị trí và khoảng cách tốt';
              setCameraGuidance((prev) => (prev !== nextGuidance ? nextGuidance : prev));

              let frameEyeScore = 100;

              // 2. Evaluate 3D Head Orientation via MediaPipe Facial Transformation Matrix
              let isHeadTurnedAway = false;
              if (matrix && matrix.length >= 16) {
                // Column-major 4x4 matrix: m[1] relates to yaw (turning left/right), m[2] relates to pitch (nodding)
                const yaw = Math.asin(Math.max(-1, Math.min(1, matrix[1]))) * (180 / Math.PI);
                const pitch = Math.atan2(-matrix[2], matrix[0]) * (180 / Math.PI);
                if (Math.abs(yaw) > 18 || Math.abs(pitch) > 18) {
                  isHeadTurnedAway = true;
                }
              } else if (landmarks[1] && landmarks[234] && landmarks[454]) {
                const faceWidthNorm = Math.abs(landmarks[454].x - landmarks[234].x);
                if (faceWidthNorm > 0.01) {
                  const noseRel = (landmarks[1].x - landmarks[234].x) / faceWidthNorm;
                  if (noseRel < 0.35 || noseRel > 0.65) {
                    isHeadTurnedAway = true;
                  }
                }
              }

              if (isHeadTurnedAway) {
                frameEyeScore = 0;
              } else if (faceResult.faceBlendshapes?.[0]?.categories?.length) {
                // 2. Evaluate Eye Gaze via MediaPipe 52 ARKit Blendshapes
                const blendMap: Record<string, number> = {};
                for (const cat of faceResult.faceBlendshapes[0].categories) {
                  blendMap[cat.categoryName] = cat.score;
                }

                const isBlinking = (blendMap['eyeBlinkLeft'] ?? 0) > 0.5 || (blendMap['eyeBlinkRight'] ?? 0) > 0.5;
                if (isBlinking) {
                  frameEyeScore = eyeSamplesRef.current.length > 0
                    ? eyeSamplesRef.current[eyeSamplesRef.current.length - 1]
                    : 100;
                } else {
                  const maxGazeDev = Math.max(
                    blendMap['eyeLookInLeft'] ?? 0,
                    blendMap['eyeLookOutLeft'] ?? 0,
                    blendMap['eyeLookInRight'] ?? 0,
                    blendMap['eyeLookOutRight'] ?? 0,
                    blendMap['eyeLookUpLeft'] ?? 0,
                    blendMap['eyeLookDownLeft'] ?? 0,
                    blendMap['eyeLookUpRight'] ?? 0,
                    blendMap['eyeLookDownRight'] ?? 0
                  );

                  if (maxGazeDev <= 0.15) {
                    frameEyeScore = 100;
                  } else if (maxGazeDev <= 0.30) {
                    frameEyeScore = Math.round(100 - ((maxGazeDev - 0.15) / 0.15) * 35);
                  } else if (maxGazeDev <= 0.50) {
                    frameEyeScore = Math.round(65 - ((maxGazeDev - 0.30) / 0.20) * 45);
                  } else {
                    frameEyeScore = Math.max(0, Math.round(20 - (maxGazeDev - 0.50) * 40));
                  }
                }
              } else {
                // 3. Fallback to iris landmarks (both horizontal & vertical)
                const rightIris = landmarks[468];
                const rightOuter = landmarks[33];
                const rightInner = landmarks[133];
                const rightTop = landmarks[159];
                const rightBottom = landmarks[145];

                const leftIris = landmarks[473];
                const leftInner = landmarks[362];
                const leftOuter = landmarks[263];
                const leftTop = landmarks[386];
                const leftBottom = landmarks[374];

                let eyeHits = 0;
                let totalEyes = 0;

                if (rightIris && rightOuter && rightInner && rightTop && rightBottom) {
                  totalEyes++;
                  const hRatio = (rightIris.x - Math.min(rightOuter.x, rightInner.x)) / Math.max(0.001, Math.abs(rightInner.x - rightOuter.x));
                  const vRatio = (rightIris.y - Math.min(rightTop.y, rightBottom.y)) / Math.max(0.001, Math.abs(rightBottom.y - rightTop.y));
                  if (hRatio >= 0.35 && hRatio <= 0.65 && vRatio >= 0.25 && vRatio <= 0.75) eyeHits++;
                }

                if (leftIris && leftOuter && leftInner && leftTop && leftBottom) {
                  totalEyes++;
                  const hRatio = (leftIris.x - Math.min(leftOuter.x, leftInner.x)) / Math.max(0.001, Math.abs(leftInner.x - leftOuter.x));
                  const vRatio = (leftIris.y - Math.min(leftTop.y, leftBottom.y)) / Math.max(0.001, Math.abs(leftBottom.y - leftTop.y));
                  if (hRatio >= 0.35 && hRatio <= 0.65 && vRatio >= 0.25 && vRatio <= 0.75) eyeHits++;
                }

                frameEyeScore = totalEyes > 0 ? Math.round((eyeHits / totalEyes) * 100) : 50;
              }

              eyeSamplesRef.current.push(frameEyeScore);
              if (eyeSamplesRef.current.length > 150) eyeSamplesRef.current.shift();
              const nextEyeContact = Math.round(eyeSamplesRef.current.reduce((sum, value) => sum + value, 0) / eyeSamplesRef.current.length);
              setEyeContact((prev) => (Math.abs(prev - nextEyeContact) >= 2 ? nextEyeContact : prev));
            } else {
              faceMissingFramesRef.current += 1;
              if (faceMissingFramesRef.current >= 3) {
                setFaceMissing(true);
                setCameraGuidance('Không thấy khuôn mặt — quay lại khung hình');
                setEyeContact((prev) => (prev !== 0 ? 0 : prev));
                setPosture((prev) => (prev !== 0 ? 0 : prev));
                eyeSamplesRef.current = [];
                postureSamplesRef.current = [];
                setGestureFeedback('Không thấy người trong khung hình');
                targetPoseRef.current = null;
              }
            }

            const poseResult = poseLandmarker.detectForVideo(videoEl, now);
            const pose = poseResult?.landmarks?.[0];
            const worldPose = poseResult?.worldLandmarks?.[0];

            if (pose && pose.length) {
              targetPoseRef.current = pose;
              const leftShoulder = pose[11];
              const rightShoulder = pose[12];
              const nose = pose[0];

              const leftVis = leftShoulder?.visibility ?? 1;
              const rightVis = rightShoulder?.visibility ?? 1;

              // Evaluate upper body posture without requiring hips (supporting sitting desk framing)
              if (leftShoulder && rightShoulder && leftVis > 0.4 && rightVis > 0.4) {
                let postureScore = 100;

                // 1. Leverage MediaPipe worldLandmarks (real-world 3D metric coordinates in meters)
                if (worldPose && worldPose[11] && worldPose[12] && worldPose[0]) {
                  const wLeft = worldPose[11];
                  const wRight = worldPose[12];
                  const wNose = worldPose[0];

                  const shoulderTiltMeters = Math.abs(wLeft.y - wRight.y);
                  const shoulderWidthMeters = Math.max(0.25, Math.hypot(wLeft.x - wRight.x, wLeft.y - wRight.y, wLeft.z - wRight.z));

                  // Neck vertical height (slouching / hunching causes head to collapse toward shoulders)
                  const shoulderMidY = (wLeft.y + wRight.y) / 2;
                  const neckHeightMeters = Math.abs(shoulderMidY - wNose.y);
                  const neckRatio = neckHeightMeters / shoulderWidthMeters;

                  // Forward head lean (turtle neck - z difference in meters)
                  const shoulderMidZ = (wLeft.z + wRight.z) / 2;
                  const forwardLeanMeters = wNose.z - shoulderMidZ;

                  // Penalty for shoulder tilt (> 3.5cm tilt)
                  if (shoulderTiltMeters > 0.035) {
                    postureScore -= Math.min(35, Math.round((shoulderTiltMeters - 0.035) * 450));
                  }

                  // Penalty for slouching / collapsed neck (< 0.52 ratio)
                  if (neckRatio < 0.52) {
                    postureScore -= Math.min(45, Math.round((0.52 - neckRatio) * 160));
                  }

                  // Penalty for forward head thrust (< -0.14m forward)
                  if (forwardLeanMeters < -0.14) {
                    postureScore -= Math.min(30, Math.round(Math.abs(forwardLeanMeters + 0.14) * 120));
                  }

                  // Check lateral lean if hips are present
                  if (worldPose[23] && worldPose[24] && (pose[23]?.visibility ?? 0) > 0.5 && (pose[24]?.visibility ?? 0) > 0.5) {
                    const hipMidX = (worldPose[23].x + worldPose[24].x) / 2;
                    const shoulderMidX = (wLeft.x + wRight.x) / 2;
                    const lateralLean = Math.abs(shoulderMidX - hipMidX);
                    if (lateralLean > 0.08) {
                      postureScore -= Math.min(25, Math.round((lateralLean - 0.08) * 150));
                    }
                  }
                } else {
                  // Fallback: 2D normalized upper-body geometry
                  const shoulderWidth = Math.max(0.08, Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y));
                  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth;
                  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
                  const neckLength = nose ? (shoulderMidY - nose.y) / shoulderWidth : 0.65;

                  if (shoulderTilt > 0.10) {
                    postureScore -= Math.min(40, Math.round((shoulderTilt - 0.10) * 200));
                  }
                  if (neckLength < 0.52) {
                    postureScore -= Math.min(45, Math.round((0.52 - neckLength) * 150));
                  }

                  if (pose[23] && pose[24] && (pose[23].visibility ?? 1) > 0.4 && (pose[24].visibility ?? 1) > 0.4) {
                    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
                    const hipMidX = (pose[23].x + pose[24].x) / 2;
                    const torsoLength = Math.max(0.1, Math.abs((pose[23].y + pose[24].y) / 2 - shoulderMidY));
                    const lean = Math.abs(shoulderMidX - hipMidX) / torsoLength;
                    if (lean > 0.15) {
                      postureScore -= Math.min(30, Math.round((lean - 0.15) * 120));
                    }
                  }
                }

                postureScore = Math.max(25, Math.min(100, Math.round(postureScore)));
                postureSamplesRef.current.push(postureScore);
                if (postureSamplesRef.current.length > 150) postureSamplesRef.current.shift();
                const nextPosture = Math.round(postureSamplesRef.current.reduce((sum, value) => sum + value, 0) / postureSamplesRef.current.length);
                setPosture((prev) => (Math.abs(prev - nextPosture) >= 2 ? nextPosture : prev));

                // Hand gestures tracking
                const leftWrist = pose[15];
                const rightWrist = pose[16];
                const leftVisible = Boolean(leftWrist && (leftWrist.visibility ?? 1) > 0.4);
                const rightVisible = Boolean(rightWrist && (rightWrist.visibility ?? 1) > 0.4);

                if (leftVisible && rightVisible && leftWrist && rightWrist) {
                  const previous = previousHandsRef.current;
                  const hasExpressiveMovement = previous && (
                    Math.hypot(leftWrist.x - previous.leftX, leftWrist.y - previous.leftY) > 0.05
                    || Math.hypot(rightWrist.x - previous.rightX, rightWrist.y - previous.rightY) > 0.05
                  );
                  const waistY = (pose[23] && pose[24]) ? (pose[23].y + pose[24].y) / 2 : ((leftShoulder.y + rightShoulder.y) / 2) + 0.32;
                  const handsInGestureZone = leftWrist.y < waistY || rightWrist.y < waistY;
                  if (hasExpressiveMovement && handsInGestureZone && now - lastGestureAtRef.current > 850) {
                    lastGestureAtRef.current = now;
                    setGestureCount((count) => count + 1);
                  }
                  const nextFeedback = handsInGestureZone ? 'Tay linh hoạt trong vùng nói' : 'Thả lỏng & nâng tay nhẹ';
                  setGestureFeedback((prev) => (prev !== nextFeedback ? nextFeedback : prev));
                  previousHandsRef.current = { leftX: leftWrist.x, leftY: leftWrist.y, rightX: rightWrist.x, rightY: rightWrist.y };
                } else {
                  previousHandsRef.current = null;
                  setGestureFeedback((prev) => (prev !== 'Đưa tay vào khung hình để theo dõi' ? 'Đưa tay vào khung hình để theo dõi' : prev));
                }
              } else {
                previousHandsRef.current = null;
                setPosture((prev) => (prev !== 0 ? 0 : prev));
                setGestureFeedback((prev) => (prev !== 'Đưa phần thân trên vào khung hình' ? 'Đưa phần thân trên vào khung hình' : prev));
              }
            } else {
              targetPoseRef.current = null;
            }
          } catch {
            setTrackingError('Đang xử lý phân tích hình ảnh.');
          }
        }
      }

      // 3. Fluid 60 FPS Skeleton Rendering with smooth interpolation (runs EVERY animation frame)
      const canvas = poseCanvasRef.current;
      if (canvas && videoEl) {
        const context = canvas.getContext('2d');
        if (context) {
          if (videoEl.videoWidth && videoEl.videoHeight) {
            if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
              canvas.width = videoEl.videoWidth;
              canvas.height = videoEl.videoHeight;
            }
          }

          if (!showSkeletonRef.current) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            smoothedPoseRef.current = null;
          } else {
            const target = targetPoseRef.current;
            if (target && target.length > 0) {
              let current = smoothedPoseRef.current;
              if (!current || current.length !== target.length) {
                current = target.map((pt) => ({ ...pt }));
                smoothedPoseRef.current = current;
              } else {
                const lerpFactor = 0.45; // Smooth exponential interpolation for fluid real-time motion
                for (let i = 0; i < target.length; i++) {
                  const t = target[i];
                  const c = current[i];
                  if (t && c) {
                    c.x += (t.x - c.x) * lerpFactor;
                    c.y += (t.y - c.y) * lerpFactor;
                    c.z = t.z;
                    c.visibility = t.visibility;
                  }
                }
              }

              context.clearRect(0, 0, canvas.width, canvas.height);
              const links = [
                [0, 11], [0, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
              ];
              context.strokeStyle = 'rgba(138, 180, 248, 0.85)';
              context.lineWidth = Math.max(3, canvas.width / 260);
              context.lineCap = 'round';
              context.lineJoin = 'round';
              for (const [start, end] of links) {
                const first = current[start];
                const second = current[end];
                if (!first || !second || (first.visibility ?? 1) < 0.4 || (second.visibility ?? 1) < 0.4) continue;
                context.beginPath();
                context.moveTo(first.x * canvas.width, first.y * canvas.height);
                context.lineTo(second.x * canvas.width, second.y * canvas.height);
                context.stroke();
              }
              context.fillStyle = '#8ab4f8';
              for (const point of current.slice(0, 17)) {
                if ((point.visibility ?? 1) < 0.4) continue;
                context.beginPath();
                context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(3, canvas.width / 180), 0, Math.PI * 2);
                context.fill();
              }
            } else {
              context.clearRect(0, 0, canvas.width, canvas.height);
              smoothedPoseRef.current = null;
            }
          }
        }
      }

      frameRef.current = requestAnimationFrame(trackPerformance);
    };

    trackingFrameRef.current = trackPerformance;
    frameRef.current = requestAnimationFrame(trackPerformance);
  };

  const pausePerformanceTracking = (currentSeconds: number) => {
    runRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    elapsedBeforePauseRef.current = currentSeconds;
  };

  const resumePerformanceTracking = () => {
    runRef.current = true;
    startedAtRef.current = performance.now();
    if (trackingFrameRef.current) {
      frameRef.current = requestAnimationFrame(trackingFrameRef.current);
    }
  };

  const stopPerformanceTracking = () => {
    runRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    targetPoseRef.current = null;
    smoothedPoseRef.current = null;
    const canvas = poseCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const resetPerformanceTimer = (isLive: boolean) => {
    elapsedBeforePauseRef.current = 0;
    if (isLive) {
      startedAtRef.current = performance.now();
    }
  };

  useEffect(() => {
    return () => {
      runRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return {
    poseCanvasRef,
    voiceLevel,
    wordsPerMinute,
    eyeContact,
    posture,
    cameraGuidance,
    faceMissing,
    showSkeleton,
    setShowSkeleton,
    trackingError,
    setTrackingError,
    resetTrackingMetrics,
    initVisionTasks,
    startPerformanceTracking,
    pausePerformanceTracking,
    resumePerformanceTracking,
    stopPerformanceTracking,
    resetPerformanceTimer,
  };
}
