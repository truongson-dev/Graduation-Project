import { useEffect, useRef, useState } from 'react';

export function usePresentationMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isMicMutedRef = useRef(false);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  const toggleMic = () => {
    const willBeMuted = !isMicMuted;
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
    }
    setIsMicMuted(willBeMuted);
    isMicMutedRef.current = willBeMuted;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      const willBeMuted = !isCameraMuted;
      videoTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
      setIsCameraMuted(willBeMuted);
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMediaStream(null);
  };

  const initMediaStream = async () => {
    const isStreamActive = streamRef.current && streamRef.current.active && streamRef.current.getTracks().some((t) => t.readyState === 'live');
    const stream = isStreamActive ? streamRef.current! : await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    setMediaStream(stream);
    if (videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      void videoRef.current.play().catch(() => {});
    }
    return stream;
  };

  const initAudioAnalyser = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {});
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    return { audioContext, analyser };
  };

  const startAudioRecording = (stream: MediaStream) => {
    chunksRef.current = [];
    recordingBlobRef.current = null;
    const audioOnlyStream = typeof MediaStream !== 'undefined' ? new MediaStream(stream.getAudioTracks()) : stream;
    const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : undefined));
    const recorder = new MediaRecorder(
      audioOnlyStream,
      mimeType ? { mimeType, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 },
    );
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const finalMime = recorder.mimeType || mimeType || 'audio/webm';
      const recording = new Blob(chunksRef.current, { type: finalMime });
      if (recording.size > 0) {
        recordingBlobRef.current = recording;
        const objectUrl = URL.createObjectURL(recording);
        recordingUrlRef.current = objectUrl;
        setRecordingUrl(objectUrl);
      }
    };
    recordingRef.current = recorder;
    recorder.start(1000);
    return recorder;
  };

  const pauseAudioRecording = () => {
    if (recordingRef.current?.state === 'recording') {
      recordingRef.current.pause();
    }
  };

  const resumeAudioRecording = () => {
    if (recordingRef.current?.state === 'paused') {
      recordingRef.current.resume();
    }
  };

  const stopAudioRecording = () => {
    if (recordingRef.current?.state === 'recording' || recordingRef.current?.state === 'paused') {
      recordingRef.current.stop();
    }
  };

  const closeAudioContext = () => {
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      if (videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
      }
      void videoRef.current.play().catch(() => {});
    }
  }, [mediaStream]);

  useEffect(() => {
    return () => {
      stopAudioRecording();
      stopTracks();
      closeAudioContext();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  return {
    videoRef,
    streamRef,
    mediaStream,
    recordingRef,
    chunksRef,
    recordingBlobRef,
    recordingUrl,
    isMicMuted,
    isCameraMuted,
    cameraError,
    setCameraError,
    toggleMic,
    toggleCamera,
    stopTracks,
    initMediaStream,
    initAudioAnalyser,
    startAudioRecording,
    pauseAudioRecording,
    resumeAudioRecording,
    stopAudioRecording,
    closeAudioContext,
    audioContextRef,
    analyserRef,
  };
}
