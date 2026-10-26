import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  Radio, 
  X, 
  RefreshCw, 
  Play, 
  Pause,
  Send, 
  FolderOpen, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Heart,
  Globe,
  Lock,
  Music,
  Scissors,
  Type,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Zap,
  ZapOff,
  Clock,
  ArrowRight,
  ShieldCheck,
  VideoOff,
  Download,
  Mic,
  MicOff,
  Settings,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { User, Post } from '../../types';

export type TikTokStudioMode = 'camera' | 'create' | 'live';
export type VideoDurationLimit = 15 | 60 | 600; // 15s, 60s, 10m (600s)

interface TikTokCameraStudioProps {
  isOpen: boolean;
  currentUser: User;
  initialMode?: TikTokStudioMode;
  onClose: () => void;
  onPostPublished: () => void;
}

// Background sound options
const AVAILABLE_SOUNDS = [
  { id: 'none', title: 'မူလအသံ (Original Sound)', artist: 'Original', duration: 'Original' },
  { id: 'luxury_gold', title: 'AH NYI Luxury Gold Beat', artist: 'AH NYI Studio', duration: '00:30' },
  { id: 'yangon_acoustic', title: 'Yangon Sunset Acoustic', artist: 'Myanmar Indie', duration: '00:45' },
  { id: 'bagan_traditional', title: 'Bagan Melodic Rhythm', artist: 'Traditional Fusion', duration: '01:00' },
  { id: 'tiktok_viral', title: 'TikTok Trending Bass', artist: 'Viral Beats MM', duration: '00:30' },
];

// Helper: Synthesize camera shutter sound & countdown beeps
const playAudioFeedback = (type: 'shutter' | 'beep' | 'start' | 'stop') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    if (type === 'shutter') {
      // Camera shutter snap click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'beep') {
      // Countdown beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'start') {
      // Recording start chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'stop') {
      // Recording stop chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
};

export const TikTokCameraStudio: React.FC<TikTokCameraStudioProps> = ({
  isOpen,
  currentUser,
  initialMode = 'create',
  onClose,
  onPostPublished,
}) => {
  const { t } = useTranslation();

  // Workflow Stages: 1. RECORD -> 2. EDIT -> 3. PUBLISH
  const [stage, setStage] = useState<'record' | 'edit' | 'publish'>('record');

  // Bottom Modes: CAMERA (Photo), CREATE (Video with 15s/60s/10m), LIVE
  const [studioMode, setStudioMode] = useState<TikTokStudioMode>(initialMode);
  const [durationLimit, setDurationLimit] = useState<VideoDurationLimit>(15);

  // Hidden file inputs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraPhotoRef = useRef<HTMLInputElement>(null);
  const nativeCameraVideoRef = useRef<HTMLInputElement>(null);

  // Viewfinder & Player Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const editorVideoRef = useRef<HTMLVideoElement>(null);

  // Real Hardware Camera Stream State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'normal' | 'beauty' | 'gold' | 'cyber' | 'vintage'>('beauty');
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
  const [activeTimerMode, setActiveTimerMode] = useState<0 | 3 | 10>(0);
  
  // Camera & Mic Permissions & Diagnostic State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [showTroubleshooter, setShowTroubleshooter] = useState<boolean>(false);
  const [micAudioLevel, setMicAudioLevel] = useState<number>(0);
  const [hasMicrophoneTrack, setHasMicrophoneTrack] = useState<boolean>(false);
  const audioContextRef = useRef<any>(null);
  const audioMeterIntervalRef = useRef<any>(null);

  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Segmented Recording State (TikTok style: Record, Pause, Resume, Finish)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const [recordedSegments, setRecordedSegments] = useState<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Captured Media Result
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('video');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Stage 2: Video Editing State
  const [isPlayingEditor, setIsPlayingEditor] = useState<boolean>(false);
  const [selectedSound, setSelectedSound] = useState<string>('none');
  const [isSoundDrawerOpen, setIsSoundDrawerOpen] = useState<boolean>(false);
  const [isTrimmerOpen, setIsTrimmerOpen] = useState<boolean>(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 15]);
  const [videoActualDuration, setVideoActualDuration] = useState<number>(15);
  const [textOverlay, setTextOverlay] = useState<string>('');
  const [isTextEditorOpen, setIsTextEditorOpen] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>('#F6D365');
  const [coverThumbnailUrl, setCoverThumbnailUrl] = useState<string | null>(null);

  // Live Mode Simulation State
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [liveViewersCount, setLiveViewersCount] = useState<number>(245);
  const [liveLikesCount, setLiveLikesCount] = useState<number>(512);
  const [liveCommentsList, setLiveCommentsList] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'Su Myat (ရန်ကုန်)', text: 'Live စောင့်ကြည့်နေပါတယ်ရှင့် ❤️' },
    { sender: 'Kyaw Zin', text: 'အသံရော ကင်မရာရော အရမ်းကြည်တယ် 🎙️' },
    { sender: 'Ko Min Thu', text: 'AH NYI Live မိုက်တယ် မင်္ဂလာပါ 👏' },
  ]);

  // Stage 3: Publishing State
  const [caption, setCaption] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [allowComments, setAllowComments] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [publishErrorMessage, setPublishErrorMessage] = useState<string | null>(null);

  // Check initial permissions
  const inspectPermissions = useCallback(async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
      try {
        const cam = await (navigator as any).permissions.query({ name: 'camera' });
        setCameraPermissionState(cam.state);
        cam.onchange = () => setCameraPermissionState(cam.state);
      } catch (e) {
        setCameraPermissionState('unknown');
      }

      try {
        const mic = await (navigator as any).permissions.query({ name: 'microphone' });
        setMicPermissionState(mic.state);
        mic.onchange = () => setMicPermissionState(mic.state);
      } catch (e) {
        setMicPermissionState('unknown');
      }
    }
  }, []);

  // Reset to initial mode on open
  useEffect(() => {
    if (isOpen) {
      setStudioMode(initialMode);
      setStage('record');
      setRecordingState('idle');
      setRecordedSegments([]);
      setRecordedSeconds(0);
      setHardwareError(null);
      setErrorDetails(null);
      setSaveSuccessNotice(null);
      inspectPermissions();
      startRealHardwareCamera(initialMode, facingMode);
    } else {
      stopHardwareCamera();
    }
  }, [isOpen, initialMode]);

  // Re-start camera when mode or facingMode changes in record stage
  useEffect(() => {
    if (isOpen && stage === 'record') {
      startRealHardwareCamera(studioMode, facingMode);
    }
    return () => {
      stopHardwareCamera();
    };
  }, [facingMode, studioMode]);

  // Keep video preview connected to stream
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video || !stream) return;

    try {
      video.srcObject = stream;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      const p = video.play();
      if (p !== undefined) {
        p.catch((e) => console.warn('Video play caught:', e));
      }
    } catch (err) {
      console.warn('Attach stream error:', err);
    }
  }, [stream, stage, isOpen]);

  // Audio level meter for microphone activity in video mode
  const setupAudioMeter = (mediaStream: MediaStream) => {
    try {
      if (audioMeterIntervalRef.current) {
        clearInterval(audioMeterIntervalRef.current);
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }

      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        setHasMicrophoneTrack(false);
        return;
      }
      setHasMicrophoneTrack(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioMeterIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 150);
    } catch (e) {
      console.warn('Audio meter setup warning:', e);
    }
  };

  // Live Timer & Simulation
  useEffect(() => {
    if (!isLiveActive) return;

    const tTimer = setInterval(() => setLiveDuration((sec) => sec + 1), 1000);
    const vTimer = setInterval(() => setLiveViewersCount((v) => Math.max(150, v + Math.floor(Math.random() * 5) - 2)), 3500);
    const cTimer = setInterval(() => {
      const sample = [
        { sender: 'Thura', text: 'နောက်ထပ် သီချင်းလေး ဆိုပါဦး 🎵' },
        { sender: 'Hnin Hnin', text: 'Follow လုပ်ထားတယ်နော် အစ်မ ✨' },
        { sender: 'Min Min', text: 'AH NYI Live အရမ်းကြည်တယ် 👍' },
        { sender: 'Daw Nu', text: 'မင်္ဂလာပါ အားပေးနေပါတယ်ရှင့် 🌸' },
        { sender: 'Aung Ko', text: 'အားလုံး မင်္ဂလာပါ 🇲🇲' },
      ];
      setLiveCommentsList((prev) => [...prev.slice(-8), sample[Math.floor(Math.random() * sample.length)]]);
      setLiveLikesCount((l) => l + 2);
    }, 4000);

    return () => {
      clearInterval(tTimer);
      clearInterval(vTimer);
      clearInterval(cTimer);
    };
  }, [isLiveActive]);

  // =========================================================================
  // REAL ANDROID HARDWARE CAMERA ENGINE (Direct WebRTC getUserMedia)
  // =========================================================================
  const startRealHardwareCamera = async (currentMode: TikTokStudioMode, currentFacing: 'user' | 'environment') => {
    setIsCameraLoading(true);
    setHardwareError(null);
    setErrorDetails(null);
    stopHardwareCamera();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsCameraLoading(false);
      setHardwareError('သင့် Device/Browser တွင် Camera Hardware ချိတ်ဆက်ခွင့် API မရရှိနိုင်ပါ (HTTPS ဖြစ်ရန် လိုအပ်ပါသည်)');
      setErrorDetails('navigator.mediaDevices.getUserMedia is not supported or not in a secure HTTPS context.');
      return;
    }

    // Determine whether microphone audio should be requested
    // CREATE (Video) and LIVE need microphone. CAMERA (Photo) only needs video stream.
    const needAudio = currentMode === 'create' || currentMode === 'live';

    // List of hardware constraint candidates from highest quality to fallback
    const constraintAttempts: MediaStreamConstraints[] = [
      // 1. High-fidelity with requested facing mode & audio
      {
        video: {
          facingMode: { ideal: currentFacing },
          width: { ideal: currentMode === 'camera' ? 1920 : 1280 },
          height: { ideal: currentMode === 'camera' ? 1080 : 720 },
        },
        audio: needAudio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      },
      // 2. Standard facing mode without resolution lock
      {
        video: { facingMode: currentFacing },
        audio: needAudio,
      },
      // 3. Fallback without facingMode constraint
      {
        video: true,
        audio: needAudio,
      },
      // 4. Emergency video-only fallback (if microphone permission or hardware was locked)
      {
        video: { facingMode: currentFacing },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let lastError: any = null;

    for (let i = 0; i < constraintAttempts.length; i++) {
      const constraints = constraintAttempts[i];
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream && mediaStream.getVideoTracks().length > 0) {
          setStream(mediaStream);
          setIsCameraActive(true);
          setIsCameraLoading(false);
          setHardwareError(null);
          setErrorDetails(null);

          // Update permission states
          setCameraPermissionState('granted');
          if (needAudio && mediaStream.getAudioTracks().length > 0) {
            setMicPermissionState('granted');
            setupAudioMeter(mediaStream);
          }

          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = mediaStream;
            videoPreviewRef.current.muted = true;
            videoPreviewRef.current.playsInline = true;
            videoPreviewRef.current.play().catch(console.warn);
          }
          return;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Camera attempt ${i + 1} failed:`, err);
      }
    }

    // If all attempts failed, analyze the exact error to guide the user clearly
    setIsCameraLoading(false);
    setIsCameraActive(false);

    if (lastError) {
      if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
        setCameraPermissionState('denied');
        setHardwareError('Camera နှင့် Microphone အသုံးပြုခွင့်ကို ခွင့်ပြုချက် (Permission) မပေးရသေးပါ');
        setErrorDetails('Android Settings > Apps > AH NYI > Permissions တွင် Camera နှင့် Microphone ကို Allow ပေးရန် လိုအပ်ပါသည်။');
      } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
        setHardwareError('သင့်ဖုန်းတွင် ကင်မရာ Hardware ရှာမတွေ့ပါ သို့မဟုတ် ကင်မရာပျက်နေပါသည်');
        setErrorDetails('No camera hardware found on this device.');
      } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
        setHardwareError('ကင်မရာ Hardware ကို အခြား App (ဥပမာ ဖုန်းကင်မရာ/Viber) တစ်ခုခုက သုံးစွဲနေပါသည်');
        setErrorDetails('Camera hardware is currently locked or in use by another application.');
      } else if (lastError.name === 'OverconstrainedError') {
        setHardwareError('တောင်းဆိုထားသော ကင်မရာပုံစံနှင့် ဖုန်းအမျိုးအစား မကိုက်ညီပါ');
        setErrorDetails('OverconstrainedError: Camera resolution or facing mode constraint cannot be satisfied.');
      } else {
        setHardwareError(`ကင်မရာဖွင့်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်: ${lastError.message || lastError.name}`);
        setErrorDetails(String(lastError));
      }
    } else {
      setHardwareError('ကင်မရာဖွင့်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။ ခွင့်ပြုချက် ပြန်လည်တောင်းခံကြည့်ပါ');
    }
  };

  const stopHardwareCamera = () => {
    if (audioMeterIntervalRef.current) {
      clearInterval(audioMeterIntervalRef.current);
      audioMeterIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Switch between Front (Selfie) & Rear Camera
  const handleToggleFacingMode = () => {
    if (recordingState === 'recording') return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
  };

  // Toggle Torch/Flash on supported devices
  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
        if ((capabilities as any).torch) {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn } as any],
          });
        }
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
    setIsFlashOn((prev) => !prev);
  };

  // =========================================================================
  // PHOTO WORKFLOW (Dedicated for CAMERA Mode)
  // =========================================================================
  const handleCapturePhoto = async () => {
    playAudioFeedback('shutter');
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);

    // Method 1: Hardware ImageCapture API (Highest quality)
    if (typeof (window as any).ImageCapture !== 'undefined' && stream) {
      const track = stream.getVideoTracks()[0];
      if (track && track.readyState === 'live') {
        try {
          const imgCap = new (window as any).ImageCapture(track);
          const blob = await imgCap.takePhoto();
          const reader = new FileReader();
          reader.onload = () => {
            setMediaBlob(blob);
            setMediaUrl(reader.result as string);
            setMediaType('photo');
            stopHardwareCamera();
            setStage('edit');
          };
          reader.readAsDataURL(blob);
          return;
        } catch (e) {
          console.warn('ImageCapture failed, falling back to video canvas:', e);
        }
      }
    }

    // Method 2: High-resolution Canvas snapshot from real video hardware preview
    try {
      const video = videoPreviewRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      const w = video.videoWidth > 0 ? video.videoWidth : 1280;
      const h = video.videoHeight > 0 ? video.videoHeight : 720;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle front camera selfie mirroring
      if (facingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setMediaBlob(blob);
          setMediaUrl(url);
          setMediaType('photo');
          stopHardwareCamera();
          setStage('edit');
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Photo capture error:', err);
    }
  };

  // =========================================================================
  // VIDEO RECORDING WORKFLOW (Dedicated for CREATE Mode)
  // =========================================================================
  const handleShutterClick = () => {
    if (studioMode === 'camera') {
      handleCapturePhoto();
      return;
    }
    if (studioMode === 'live') {
      toggleLiveBroadcast();
      return;
    }

    // CREATE (Video) Mode: Record -> Pause -> Resume
    if (recordingState === 'recording') {
      handlePauseRecording();
    } else if (recordingState === 'paused') {
      handleResumeRecording();
    } else {
      // Idle -> start recording with optional countdown
      if (activeTimerMode > 0) {
        setTimerCountdown(activeTimerMode);
        playAudioFeedback('beep');
        let current = activeTimerMode;
        const countdownTimer = setInterval(() => {
          current--;
          if (current <= 0) {
            clearInterval(countdownTimer);
            setTimerCountdown(null);
            executeStartRecording();
          } else {
            playAudioFeedback('beep');
            setTimerCountdown(current);
          }
        }, 1000);
      } else {
        executeStartRecording();
      }
    }
  };

  const executeStartRecording = () => {
    if (!stream) {
      startRealHardwareCamera(studioMode, facingMode);
      return;
    }

    playAudioFeedback('start');

    try {
      // Discover supported video/audio MIME types for Android compatibility
      const candidates = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ];
      let selectedMime = '';
      if (typeof MediaRecorder !== 'undefined') {
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            selectedMime = candidate;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(
        stream, 
        selectedMime ? { mimeType: selectedMime } : undefined
      );

      const chunks: Blob[] = [...recordedSegments];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
          setRecordedSegments([...chunks]);
        }
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error event:', e);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setRecordingState('recording');

      recordingTimerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          const next = prev + 1;
          if (next >= durationLimit) {
            handleFinishRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setHardwareError(`ဗီဒီယို Recording စတင်၍ မရပါ: ${err.message || 'Encoder error'}`);
    }
  };

  const handlePauseRecording = () => {
    if (!mediaRecorder || recordingState !== 'recording') return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
      }
    } catch (e) {}
    setRecordingState('paused');
  };

  const handleResumeRecording = () => {
    if (!mediaRecorder || recordingState !== 'paused') return;
    try {
      if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
      }
    } catch (e) {}
    setRecordingState('recording');

    recordingTimerRef.current = setInterval(() => {
      setRecordedSeconds((prev) => {
        const next = prev + 1;
        if (next >= durationLimit) {
          handleFinishRecording();
        }
        return next;
      });
    }, 1000);
  };

  const handleFinishRecording = () => {
    playAudioFeedback('stop');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingState('idle');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {
        assembleRecordedVideo();
      };
      try {
        mediaRecorder.stop();
      } catch (e) {
        assembleRecordedVideo();
      }
    } else {
      assembleRecordedVideo();
    }
  };

  const assembleRecordedVideo = () => {
    if (recordedSegments.length === 0) return;
    const blob = new Blob(recordedSegments, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    setMediaBlob(blob);
    setMediaUrl(url);
    setMediaType('video');
    const finalSecs = recordedSeconds || 5;
    setVideoActualDuration(finalSecs);
    setTrimRange([0, finalSecs]);
    stopHardwareCamera();
    setStage('edit'); // Transition into In-App Video Editor
  };

  // =========================================================================
  // SAVE / DOWNLOAD TO PHONE STORAGE (Requirement 6)
  // =========================================================================
  const handleSaveToPhone = () => {
    if (!mediaUrl) return;

    try {
      const a = document.createElement('a');
      a.href = mediaUrl;
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      a.download = `AH_NYI_${mediaType === 'video' ? 'Video' : 'Photo'}_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSaveSuccessNotice(
        mediaType === 'video'
          ? 'ဗီဒီယိုကို ဖုန်းထဲသို့ ဒေါင်းလုဒ်သိမ်းဆည်းပြီးပါပြီ! Gallery တွင် ကြည့်ရှုနိုင်ပါသည်။'
          : 'ဓာတ်ပုံကို ဖုန်းထဲသို့ ဒေါင်းလုဒ်သိမ်းဆည်းပြီးပါပြီ! Gallery တွင် ကြည့်ရှုနိုင်ပါသည်။'
      );
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Handle Gallery Selection (Pick existing media from phone storage)
  const handleGallerySelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopHardwareCamera();
    const isVid = file.type.startsWith('video/');
    setMediaBlob(file);
    setMediaType(isVid ? 'video' : 'photo');

    const tempUrl = URL.createObjectURL(file);
    setMediaUrl(tempUrl);

    if (isVid) {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = tempUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = Math.round(tempVideo.duration) || 10;
        setVideoActualDuration(dur);
        setTrimRange([0, dur]);
      };
    }

    setStage('edit');
    e.target.value = '';
  };

  // Toggle Live Broadcast
  const toggleLiveBroadcast = () => {
    if (isLiveActive) {
      setIsLiveActive(false);
      setMediaUrl('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1080&q=80');
      setMediaType('video');
      setVideoActualDuration(liveDuration || 30);
      setCaption(`🔴 AH NYI LIVE Replay (${Math.floor(liveDuration / 60)}:${String(liveDuration % 60).padStart(2, '0')}) - တိုက်ရိုက်ထုတ်လွှင့်ခဲ့သော ဗီဒီယို`);
      stopHardwareCamera();
      setStage('edit');
    } else {
      setIsLiveActive(true);
      setLiveDuration(0);
    }
  };

  // Discard & Return to In-App Camera
  const handleDiscardAndRetake = () => {
    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaBlob(null);
    setMediaUrl(null);
    setRecordedSegments([]);
    setRecordedSeconds(0);
    setRecordingState('idle');
    setTextOverlay('');
    setSaveSuccessNotice(null);
    setStage('record');
    startRealHardwareCamera(studioMode, facingMode);
  };

  // =========================================================================
  // PUBLISH POST TO AH NYI SOCIAL FEED
  // =========================================================================
  const handlePublishPost = async () => {
    if (!caption.trim() && !mediaUrl) {
      setPublishErrorMessage('စာတို သို့မဟုတ် ဗီဒီယို/ဓာတ်ပုံ တစ်ခုခု ထည့်သွင်းပေးပါ');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setPublishErrorMessage(null);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 95;
          }
          return prev + 25;
        });
      }, 150);

      const trimmedDuration = Math.round(trimRange[1] - trimRange[0]) || videoActualDuration;

      const newPost: Post = {
        id: `post_tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatar,
        authorVerified: currentUser.isVerified,
        authorRole: currentUser.role,
        type: mediaType,
        mediaUrl: mediaUrl || undefined,
        mediaThumbnail: coverThumbnailUrl || undefined,
        mediaDuration: mediaType === 'video' ? trimmedDuration : undefined,
        caption: caption.trim() || (mediaType === 'video' ? '🎥 AH NYI Video #AhNyi #Viral' : '📸 AH NYI Photo #AhNyi'),
        hashtags: ['#AhNyi', '#Myanmar', '#Viral', '#TikTokMyanmar'],
        likes: [],
        likesCount: 1,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 1,
        createdAt: new Date().toISOString(),
        privacy: privacy,
      };

      await storage.createPost(newPost);
      await storage.updateUser(currentUser.id, {
        postsCount: (currentUser.postsCount || 0) + 1,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        handleClose();
        onPostPublished();
      }, 400);
    } catch (err: any) {
      setIsUploading(false);
      setPublishErrorMessage(err.message || 'Post တင်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။');
    }
  };

  const handleClose = () => {
    stopHardwareCamera();
    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaBlob(null);
    setMediaUrl(null);
    setRecordedSegments([]);
    setRecordedSeconds(0);
    setRecordingState('idle');
    setIsLiveActive(false);
    setTextOverlay('');
    setCaption('');
    setHardwareError(null);
    setPublishErrorMessage(null);
    setShowTroubleshooter(false);
    onClose();
  };

  const filterStyle = () => {
    switch (selectedFilter) {
      case 'beauty': return 'contrast(106%) brightness(108%) saturate(115%)';
      case 'gold': return 'sepia(30%) saturate(135%) contrast(108%)';
      case 'cyber': return 'hue-rotate(185deg) saturate(120%)';
      case 'vintage': return 'sepia(50%) contrast(120%) brightness(95%)';
      default: return 'none';
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Hidden Gallery Picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleGallerySelected}
      />

      {/* Emergency Native Camera Inputs (for devices with restricted WebRTC sandbox) */}
      <input
        ref={nativeCameraPhotoRef}
        type="file"
        accept="image/*"
        capture={facingMode === 'user' ? 'user' : 'environment'}
        className="hidden"
        onChange={handleGallerySelected}
      />
      <input
        ref={nativeCameraVideoRef}
        type="file"
        accept="video/*"
        capture={facingMode === 'user' ? 'user' : 'environment'}
        className="hidden"
        onChange={handleGallerySelected}
      />

      <div className="relative w-full h-full max-w-lg max-h-[100dvh] bg-[#0B0E14] flex flex-col overflow-hidden sm:rounded-3xl border border-[#D4AF37]/35 shadow-2xl">
        {/* Flash Effect Overlay */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-150" />
        )}

        {/* Save to Phone Notification Toast */}
        {saveSuccessNotice && (
          <div className="absolute top-16 inset-x-4 z-50 p-3 rounded-2xl bg-emerald-600/90 text-white backdrop-blur-md border border-emerald-400 shadow-2xl text-xs font-myanmar flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="w-5 h-5 shrink-0 text-white" />
            <span className="flex-1 font-medium">{saveSuccessNotice}</span>
          </div>
        )}

        {/* =========================================================================
            STAGE 1: 100% IN-APP REAL HARDWARE CAMERA & RECORDING VIEWFINDER
           ========================================================================= */}
        {stage === 'record' && (
          <div className="relative flex-1 w-full h-full flex flex-col justify-between overflow-hidden">
            {/* Top Video Segmented Progress Bar */}
            {studioMode === 'create' && (
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/20 z-40 overflow-hidden flex">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (recordedSeconds / durationLimit) * 100)}%` }}
                />
              </div>
            )}

            {/* TOP BAR: Close, Sound Picker, Flash, Troubleshooter */}
            <div className="relative p-4 pt-5 z-40 flex items-center justify-between">
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 active:scale-95 transition"
                title="ပိတ်မည်"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Sound Picker Pill */}
              <button
                onClick={() => setIsSoundDrawerOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-myanmar flex items-center gap-1.5 border border-[#D4AF37]/40 shadow-lg active:scale-95 transition truncate max-w-[190px]"
              >
                <Music className="w-3.5 h-3.5 text-[#F6D365]" />
                <span className="truncate">
                  {AVAILABLE_SOUNDS.find((s) => s.id === selectedSound)?.title || 'သီချင်းထည့်မည်'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {/* Flash / Torch */}
                <button
                  onClick={toggleFlash}
                  className={`p-2 rounded-full backdrop-blur-md border active:scale-95 transition ${
                    isFlashOn
                      ? 'bg-[#D4AF37] text-black border-[#F6D365]'
                      : 'bg-black/60 text-white border-white/15'
                  }`}
                  title="Flash"
                >
                  {isFlashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>

                {/* Diagnostics / Troubleshooter Help Button */}
                <button
                  onClick={() => setShowTroubleshooter(true)}
                  className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 active:scale-95 transition"
                  title="ကင်မရာနှင့် အသံ စစ်ဆေးမှု"
                >
                  <HelpCircle className="w-5 h-5 text-[#F6D365]" />
                </button>
              </div>
            </div>

            {/* RIGHT SIDEBAR TOOLS (Flip, Timer, Beauty, Retry) */}
            <div className="absolute right-3 top-20 z-40 flex flex-col gap-3">
              {/* 1. In-App Flip Camera (Front / Rear) */}
              <button
                onClick={handleToggleFacingMode}
                className="flex flex-col items-center gap-1 text-white group active:scale-95 transition"
                title="ရှေ့/နောက် ကင်မရာ ပြောင်းမည်"
              >
                <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 group-hover:bg-black/80">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-myanmar drop-shadow">
                  {facingMode === 'user' ? 'ရှေ့' : 'နောက်'}
                </span>
              </button>

              {/* 2. Timer (3s / 10s) */}
              {studioMode === 'create' && (
                <button
                  onClick={() => {
                    const next: (0 | 3 | 10)[] = [0, 3, 10];
                    const idx = (next.indexOf(activeTimerMode) + 1) % next.length;
                    setActiveTimerMode(next[idx]);
                  }}
                  className="flex flex-col items-center gap-1 text-white group active:scale-95 transition"
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border ${
                    activeTimerMode > 0 ? 'bg-red-600 border-red-400 text-white' : 'bg-black/60 border-white/15'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono drop-shadow">
                    {activeTimerMode === 0 ? 'Timer' : `${activeTimerMode}s`}
                  </span>
                </button>
              )}

              {/* 3. Beauty Filters */}
              <button
                onClick={() => {
                  const filters: ('normal' | 'beauty' | 'gold' | 'cyber' | 'vintage')[] = ['normal', 'beauty', 'gold', 'cyber', 'vintage'];
                  const idx = (filters.indexOf(selectedFilter) + 1) % filters.length;
                  setSelectedFilter(filters[idx]);
                }}
                className="flex flex-col items-center gap-1 text-white group active:scale-95 transition"
              >
                <div className={`p-2.5 rounded-full backdrop-blur-md border ${
                  selectedFilter !== 'normal' ? 'bg-[#D4AF37] text-black border-[#F6D365]' : 'bg-black/60 border-white/15'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-myanmar drop-shadow">Filter</span>
              </button>

              {/* 4. Force Reconnect to Real Hardware Camera */}
              <button
                onClick={() => startRealHardwareCamera(studioMode, facingMode)}
                className="flex flex-col items-center gap-1 text-white group active:scale-95 transition"
                title="ကင်မရာ ပြန်လည်ချိတ်ဆက်မည်"
              >
                <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-myanmar drop-shadow">စစ်ဆေး</span>
              </button>
            </div>

            {/* REAL HARDWARE CAMERA VIEWFINDER */}
            <div className="absolute inset-0 z-10 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  v.muted = true;
                  v.play().catch(console.warn);
                }}
                style={{ filter: filterStyle() }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Status Overlay Badge */}
              <div className="absolute top-16 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-white flex items-center gap-1.5 font-mono">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                  <span className="font-bold uppercase tracking-wider">
                    {studioMode} • {isCameraActive ? 'LIVE HARDWARE' : 'CONNECTING'}
                  </span>
                </div>

                {/* Microphone Level Visualizer Indicator in Video mode */}
                {studioMode === 'create' && (
                  <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] text-white flex items-center gap-1.5">
                    {hasMicrophoneTrack ? (
                      <>
                        <Mic className="w-3 h-3 text-emerald-400" />
                        <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 transition-all duration-100" 
                            style={{ width: `${Math.max(5, micAudioLevel)}%` }} 
                          />
                        </div>
                        <span className="text-[9px] text-gray-300 font-mono">MIC ON</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] text-amber-300 font-myanmar">Mic မပါ</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Recording Indicator & Timer */}
              {recordingState === 'recording' && (
                <div className="absolute top-16 inset-x-0 z-20 flex justify-center pointer-events-none">
                  <div className="px-3 py-1 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-2xl animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    <span>REC {formatTimer(recordedSeconds)} / {formatTimer(durationLimit)}</span>
                  </div>
                </div>
              )}

              {/* Countdown Beep Display */}
              {timerCountdown !== null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="w-32 h-32 rounded-full gold-gradient-bg text-black flex items-center justify-center text-6xl font-black font-mono shadow-2xl animate-ping">
                    {timerCountdown}
                  </div>
                </div>
              )}

              {/* Hardware Camera Error Card / Permission Denied Screen */}
              {hardwareError && !isCameraActive && (
                <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <VideoOff className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="font-bold text-white text-base font-myanmar">
                      ကင်မရာ ချိတ်ဆက်၍ မရပါ
                    </h4>
                    <p className="text-xs text-red-300 font-myanmar leading-relaxed">
                      {hardwareError}
                    </p>
                    {errorDetails && (
                      <p className="text-[10px] text-gray-400 font-mono pt-1">
                        {errorDetails}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
                    {/* Primary Button: Request Camera & Microphone Permissions */}
                    <button
                      onClick={() => startRealHardwareCamera(studioMode, facingMode)}
                      className="w-full py-3 px-4 rounded-xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-myanmar">Camera & Mic ခွင့်ပြုချက် ပေးမည်</span>
                    </button>

                    {/* Secondary Emergency Native Phone Shutter */}
                    <button
                      onClick={() => {
                        if (studioMode === 'camera') {
                          nativeCameraPhotoRef.current?.click();
                        } else {
                          nativeCameraVideoRef.current?.click();
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs font-myanmar flex items-center justify-center gap-2 border border-white/15 transition"
                    >
                      <Camera className="w-4 h-4 text-[#F6D365]" />
                      <span>ဖုန်း၏ မူလ Camera ဖြင့် ရိုက်ကူးမည်</span>
                    </button>

                    {/* Troubleshooter Guide */}
                    <button
                      onClick={() => setShowTroubleshooter(true)}
                      className="text-xs text-gray-400 hover:text-white font-myanmar pt-1"
                    >
                      Android Permission ပြင်ဆင်နည်း ကြည့်ရှုမည်
                    </button>
                  </div>
                </div>
              )}

              {/* LIVE Mode Overlay */}
              {studioMode === 'live' && isLiveActive && (
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 pt-16">
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 rounded-full bg-red-600 text-white font-mono text-xs font-bold animate-pulse">
                      🔴 LIVE {formatTimer(liveDuration)}
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-black/60 text-white font-mono text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{liveViewersCount}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pointer-events-auto">
                    {liveCommentsList.map((c, i) => (
                      <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 text-xs text-white backdrop-blur-md">
                        <span className="font-semibold text-amber-300 text-[11px]">{c.sender}:</span>
                        <span className="text-gray-100 font-myanmar">{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM IN-APP CONTROLS: Duration Pills, Big Shutter, Gallery, Mode Selector */}
            <div className="relative z-40 p-4 pb-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
              {/* 1. Duration Pills: 10m, 60s, 15s (In CREATE Mode) */}
              {studioMode === 'create' && recordingState === 'idle' && (
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                  <button
                    onClick={() => setDurationLimit(600)}
                    className={`text-xs font-mono font-bold transition px-2 py-0.5 rounded-full ${
                      durationLimit === 600 ? 'bg-[#D4AF37] text-black' : 'text-gray-400'
                    }`}
                  >
                    10m
                  </button>
                  <button
                    onClick={() => setDurationLimit(60)}
                    className={`text-xs font-mono font-bold transition px-2 py-0.5 rounded-full ${
                      durationLimit === 60 ? 'bg-[#D4AF37] text-black' : 'text-gray-400'
                    }`}
                  >
                    60s
                  </button>
                  <button
                    onClick={() => setDurationLimit(15)}
                    className={`text-xs font-mono font-bold transition px-2 py-0.5 rounded-full ${
                      durationLimit === 15 ? 'bg-[#D4AF37] text-black' : 'text-gray-400'
                    }`}
                  >
                    15s
                  </button>
                </div>
              )}

              {/* 2. Shutter Center Bar */}
              <div className="w-full flex items-center justify-around">
                {/* Left: Quick In-App Flip */}
                <button
                  onClick={handleToggleFacingMode}
                  className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
                  title="ရှေ့/နောက် ကင်မရာ"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-myanmar">ကင်မရာလှည့်</span>
                </button>

                {/* Center: IN-APP SHUTTER / RECORD BUTTON */}
                <div className="relative flex items-center justify-center">
                  {studioMode === 'camera' ? (
                    // In-App Real Photo Shutter
                    <button
                      onClick={handleShutterClick}
                      disabled={isCameraLoading}
                      className="p-1 active:scale-95 transition disabled:opacity-50"
                      title="ဓာတ်ပုံရိုက်မည်"
                    >
                      <div className="w-20 h-20 rounded-full border-4 border-[#D4AF37] flex items-center justify-center shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-white shadow-xl hover:scale-105 transition" />
                      </div>
                    </button>
                  ) : studioMode === 'live' ? (
                    // Live Broadcast Shutter
                    <button
                      onClick={handleShutterClick}
                      disabled={isCameraLoading}
                      className="p-1 active:scale-95 transition"
                      title="တိုက်ရိုက်လွှင့်မည်"
                    >
                      <div className="w-20 h-20 rounded-full border-4 border-red-600 flex items-center justify-center shadow-2xl">
                        <div className="w-16 h-16 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center justify-center font-mono">
                          {isLiveActive ? 'STOP' : 'LIVE'}
                        </div>
                      </div>
                    </button>
                  ) : (
                    // In-App Real Video Shutter (Record / Pause / Resume)
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShutterClick}
                        disabled={isCameraLoading}
                        className="p-1 active:scale-95 transition"
                        title={recordingState === 'recording' ? 'ခေတ္တရပ်မည်' : 'ဗီဒီယို စတင်ရိုက်မည်'}
                      >
                        <div className="w-20 h-20 rounded-full border-4 border-red-500/70 flex items-center justify-center shadow-2xl">
                          {recordingState === 'recording' ? (
                            <div className="w-9 h-9 rounded-md bg-red-600 shadow-xl animate-pulse" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-red-600 shadow-xl" />
                          )}
                        </div>
                      </button>

                      {/* If paused or segments exist: Finish Checkmark Button */}
                      {(recordingState === 'paused' || recordedSegments.length > 0) && (
                        <button
                          onClick={handleFinishRecording}
                          className="p-3.5 rounded-full bg-red-600 text-white shadow-2xl active:scale-95 transition border-2 border-white animate-bounce"
                          title="ဗီဒီယို ရိုက်ကူးမှု ပြီးဆုံးမည်"
                        >
                          <Check className="w-6 h-6 stroke-[3]" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Phone Gallery Picker */}
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
                  title="ဖုန်းထဲမှ ရွေးချယ်မည်"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                    <FolderOpen className="w-5 h-5 text-[#F6D365]" />
                  </div>
                  <span className="text-[10px] font-myanmar">Gallery</span>
                </button>
              </div>

              {/* 3. Bottom Mode Selector Tabs (CAMERA, CREATE, LIVE) */}
              <div className="flex items-center gap-6 pt-1">
                <button
                  onClick={() => {
                    if (recordingState === 'recording') return;
                    setStudioMode('camera');
                  }}
                  className={`text-xs font-bold font-myanmar tracking-wider transition ${
                    studioMode === 'camera' ? 'text-[#F6D365] scale-110' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  CAMERA (ဓာတ်ပုံ)
                </button>

                <button
                  onClick={() => {
                    if (recordingState === 'recording') return;
                    setStudioMode('create');
                  }}
                  className={`text-xs font-bold font-myanmar tracking-wider transition ${
                    studioMode === 'create' ? 'text-white scale-110' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  CREATE (ဗီဒီယို)
                </button>

                <button
                  onClick={() => {
                    if (recordingState === 'recording') return;
                    setStudioMode('live');
                  }}
                  className={`text-xs font-bold font-myanmar tracking-wider transition ${
                    studioMode === 'live' ? 'text-red-500 scale-110 animate-pulse' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  LIVE (တိုက်ရိုက်)
                </button>
              </div>
            </div>

            {/* In-App Music / Sounds Drawer */}
            {isSoundDrawerOpen && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex flex-col justify-end">
                <div className="bg-[#161C27] rounded-3xl p-4 border border-[#D4AF37]/30 space-y-3 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h4 className="font-bold text-white text-sm font-myanmar flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#F6D365]" />
                      <span>သီချင်းနှင့် အသံ ရွေးချယ်ရန် (Music & Sounds)</span>
                    </h4>
                    <button
                      onClick={() => setIsSoundDrawerOpen(false)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {AVAILABLE_SOUNDS.map((sound) => (
                      <div
                        key={sound.id}
                        onClick={() => {
                          setSelectedSound(sound.id);
                          setIsSoundDrawerOpen(false);
                        }}
                        className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                          selectedSound === sound.id
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white'
                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/10 text-[#F6D365]">
                            <Music className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs text-white">{sound.title}</h5>
                            <p className="text-[10px] text-gray-400">{sound.artist} • {sound.duration}</p>
                          </div>
                        </div>
                        {selectedSound === sound.id && (
                          <CheckCircle className="w-5 h-5 text-[#F6D365]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Android Permissions & Troubleshooting Modal */}
            {showTroubleshooter && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-5 flex flex-col justify-center items-center">
                <div className="w-full max-w-sm bg-[#161C27] rounded-3xl p-5 border border-[#D4AF37]/40 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-bold text-white text-sm font-myanmar flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#F6D365]" />
                      <span>Camera & Audio စစ်ဆေးမှု</span>
                    </h4>
                    <button
                      onClick={() => setShowTroubleshooter(false)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Permission Diagnostic Badges */}
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Camera className="w-4 h-4 text-[#F6D365]" />
                        <span className="text-xs text-white font-myanmar">Camera ခွင့်ပြုချက်</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                        cameraPermissionState === 'granted' || isCameraActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {cameraPermissionState === 'granted' || isCameraActive ? 'ခွင့်ပြုပြီး' : 'တောင်းခံရန်လို'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Mic className="w-4 h-4 text-[#F6D365]" />
                        <span className="text-xs text-white font-myanmar">Microphone ခွင့်ပြုချက်</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                        hasMicrophoneTrack || micPermissionState === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {hasMicrophoneTrack || micPermissionState === 'granted' ? 'ခွင့်ပြုပြီး' : 'တောင်းခံရန်လို'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-300 font-myanmar space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                    <p className="font-semibold text-[#F6D365]">📱 Android ဖုန်းတွင် ဖွင့်နည်း:</p>
                    <p className="text-[11px] text-gray-400">
                      ဖုန်း၏ <strong>Settings &gt; Apps &gt; AH NYI</strong> (သို့မဟုတ် Browser) &gt; <strong>Permissions</strong> သို့ သွား၍ Camera နှင့် Microphone ကို <strong>"Allow"</strong> ရွေးချယ်ပေးပါ။
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowTroubleshooter(false);
                      startRealHardwareCamera(studioMode, facingMode);
                    }}
                    className="w-full py-3 rounded-xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>ခွင့်ပြုချက် ပြန်လည်တောင်းခံမည်</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STAGE 2: IN-APP VIDEO/PHOTO EDITOR + DIRECT PHONE DOWNLOAD
           ========================================================================= */}
        {stage === 'edit' && (
          <div className="relative flex-1 w-full h-full flex flex-col justify-between overflow-hidden bg-black">
            {/* Top Bar: Discard, Music Badge, Save to Phone, Next */}
            <div className="p-4 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={handleDiscardAndRetake}
                className="px-3.5 py-1.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 text-xs font-myanmar flex items-center gap-1.5 active:scale-95 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ပြန်ရိုက်မည်</span>
              </button>

              {/* Save / Download to Phone Storage Button */}
              <button
                onClick={handleSaveToPhone}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-myanmar flex items-center gap-1.5 active:scale-95 transition shadow-lg"
                title="ဖုန်းထဲသို့ သိမ်းဆည်းမည်"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ဖုန်းထဲသိမ်းမည်</span>
              </button>

              <button
                onClick={() => setStage('publish')}
                className="px-4 py-1.5 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center gap-1.5 shadow-xl active:scale-95 transition"
              >
                <span>Next (ရှေ့သို့)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Center Player Area */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
              {mediaType === 'video' ? (
                <>
                  <video
                    ref={editorVideoRef}
                    src={mediaUrl || ''}
                    playsInline
                    loop
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlayingEditor(true)}
                    onPause={() => setIsPlayingEditor(false)}
                  />

                  {/* Play / Pause Tap Trigger */}
                  <button
                    onClick={() => {
                      const v = editorVideoRef.current;
                      if (!v) return;
                      if (isPlayingEditor) v.pause();
                      else v.play().catch(console.warn);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/15"
                  >
                    {!isPlayingEditor && (
                      <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-2xl">
                        <Play className="w-8 h-8 ml-1 fill-white" />
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <img
                  src={mediaUrl || ''}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Text Sticker Overlay on Video */}
              {textOverlay && (
                <div
                  className="absolute bottom-28 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md text-center max-w-[85%] font-bold text-base shadow-2xl border border-white/20 select-none animate-in zoom-in-95 duration-200"
                  style={{ color: textColor }}
                >
                  {textOverlay}
                </div>
              )}
            </div>

            {/* Right Editing Sidebar: Text, Trim, Cover */}
            <div className="absolute right-3 top-20 z-30 flex flex-col gap-3">
              {/* 1. Add Text on Video */}
              <button
                onClick={() => setIsTextEditorOpen(true)}
                className="flex flex-col items-center gap-1 text-white active:scale-95 transition"
              >
                <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                  <Type className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-myanmar drop-shadow">စာသား</span>
              </button>

              {/* 2. Video Trimmer */}
              {mediaType === 'video' && (
                <button
                  onClick={() => setIsTrimmerOpen((prev) => !prev)}
                  className={`flex flex-col items-center gap-1 text-white active:scale-95 transition ${
                    isTrimmerOpen ? 'text-[#F6D365]' : ''
                  }`}
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border ${
                    isTrimmerOpen ? 'bg-[#D4AF37] text-black border-[#F6D365]' : 'bg-black/60 border-white/15'
                  }`}>
                    <Scissors className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-myanmar drop-shadow">ဖြတ်တောက်</span>
                </button>
              )}

              {/* 3. Cover Image Frame Picker */}
              {mediaType === 'video' && (
                <button
                  onClick={() => {
                    const video = editorVideoRef.current;
                    if (video) {
                      const canvas = document.createElement('canvas');
                      canvas.width = 480;
                      canvas.height = 640;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, 480, 640);
                        const coverUrl = canvas.toDataURL('image/jpeg', 0.85);
                        setCoverThumbnailUrl(coverUrl);
                      }
                    }
                  }}
                  className="flex flex-col items-center gap-1 text-white active:scale-95 transition"
                  title="Cover ပုံ ရွေးမည်"
                >
                  <div className={`p-2.5 rounded-full backdrop-blur-md border ${
                    coverThumbnailUrl ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-black/60 border-white/15'
                  }`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-myanmar drop-shadow">Cover</span>
                </button>
              )}
            </div>

            {/* Video Trimmer Slider Overlay */}
            {isTrimmerOpen && mediaType === 'video' && (
              <div className="p-4 bg-[#161C27]/95 border-t border-white/10 z-40 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-300 font-myanmar">
                  <span>ဗီဒီယို ဖြတ်တောက်ချိန်:</span>
                  <span className="font-mono text-[#F6D365]">
                    {trimRange[0]}s - {trimRange[1]}s ({trimRange[1] - trimRange[0]}s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">0s</span>
                  <input
                    type="range"
                    min="0"
                    max={videoActualDuration}
                    value={trimRange[1]}
                    onChange={(e) => setTrimRange([trimRange[0], Number(e.target.value)])}
                    className="w-full accent-[#D4AF37]"
                  />
                  <span className="text-[10px] text-gray-400">{videoActualDuration}s</span>
                </div>
              </div>
            )}

            {/* Text Sticker Input Modal */}
            {isTextEditorOpen && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-6 flex flex-col justify-center items-center space-y-4">
                <h4 className="font-bold text-white text-sm font-myanmar">ဗီဒီယိုပေါ်တွင် စာသားရေးထည့်ပါ</h4>
                <input
                  type="text"
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="စာသား ရေးထည့်ပါ..."
                  className="w-full text-center text-lg font-bold bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]"
                  style={{ color: textColor }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  {['#F6D365', '#FFFFFF', '#EF4444', '#10B981', '#3B82F6', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className="w-7 h-7 rounded-full border-2 border-white/30"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setIsTextEditorOpen(false)}
                  className="px-6 py-2.5 rounded-full gold-gradient-bg text-black font-bold text-xs"
                >
                  ပြီးပါပြီ (Done)
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STAGE 3: IN-APP UPLOAD & PUBLISH SCREEN
           ========================================================================= */}
        {stage === 'publish' && (
          <div className="relative flex-1 w-full h-full flex flex-col justify-between overflow-y-auto p-5 bg-gradient-to-b from-[#121620] to-[#0B0E14] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                onClick={() => setStage('edit')}
                className="text-xs text-gray-400 hover:text-white font-myanmar flex items-center gap-1"
              >
                <span>&larr; ပြင်ဆင်ရန်သို့ ပြန်သွားမည်</span>
              </button>
              <h3 className="font-bold text-base text-white font-myanmar">Post တင်ခြင်း</h3>
              <button
                onClick={handleSaveToPhone}
                className="p-1.5 rounded-full bg-white/10 text-emerald-400 hover:text-emerald-300"
                title="ဖုန်းထဲသိမ်းမည်"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Video Thumbnail & Caption Input Card */}
            <div className="flex gap-3 bg-[#1A1F2C] p-3.5 rounded-2xl border border-white/10">
              {/* Media Thumbnail */}
              <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-black shrink-0 border border-white/15">
                {coverThumbnailUrl ? (
                  <img src={coverThumbnailUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : mediaType === 'video' ? (
                  <video src={mediaUrl || ''} className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaUrl || ''} alt="Thumbnail" className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                  {mediaType === 'video' ? `${trimRange[1] - trimRange[0]}s` : 'PHOTO'}
                </div>
              </div>

              {/* Caption Area */}
              <div className="flex-1 flex flex-col justify-between">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="ဗီဒီယိုအကြောင်း စိတ်ဝင်စားဖွယ် စာတိုရေးသားပါ... #AhNyi #Viral #TikTok"
                  rows={4}
                  className="w-full bg-transparent text-white placeholder-gray-500 text-xs resize-none focus:outline-none font-myanmar leading-relaxed"
                />
                <div className="text-[10px] text-gray-400 font-mono text-right">
                  {caption.length}/500
                </div>
              </div>
            </div>

            {/* Quick Hashtags */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-myanmar">လူကြိုက်များသော Hashtag များ ထည့်မည်:</span>
              <div className="flex flex-wrap gap-1.5">
                {['#AhNyi', '#Myanmar', '#TikTokMyanmar', '#Viral', '#Creator', '#Yangon', '#Music'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!caption.includes(tag)) {
                        setCaption((prev) => `${prev} ${tag}`.trim());
                      }
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 text-xs border border-white/10 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy & Settings */}
            <div className="space-y-3 bg-[#1A1F2C] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 font-myanmar flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#F6D365]" />
                  <span>ကြည့်ရှုနိုင်သူ ရွေးချယ်မှု (Audience)</span>
                </span>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="public" className="bg-[#121620]">Public (လူတိုင်း)</option>
                  <option value="followers" className="bg-[#121620]">Followers သာ</option>
                  <option value="private" className="bg-[#121620]">Private (မိမိသာ)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-gray-300 font-myanmar">မှတ်ချက်ပေးခွင့် (Allow Comments)</span>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37]"
                />
              </div>
            </div>

            {/* Upload Progress Indicator */}
            {isUploading && (
              <div className="space-y-2 bg-[#1A1F2C] p-3.5 rounded-2xl border border-[#D4AF37]/30">
                <div className="flex justify-between text-xs text-gray-300 font-myanmar">
                  <span>ဗီဒီယို Upload တင်နေမှု အဆင့်</span>
                  <span className="font-mono text-[#F6D365]">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full gold-gradient-bg transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {publishErrorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-myanmar flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishErrorMessage}</span>
              </div>
            )}

            {/* Bottom Final Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveToPhone}
                disabled={isUploading}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs font-myanmar transition flex items-center gap-1.5"
                title="ဖုန်းထဲသို့ သိမ်းမည်"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>ဖုန်းထဲသိမ်းမည်</span>
              </button>

              <button
                onClick={handlePublishPost}
                disabled={isUploading}
                className="flex-1 py-3.5 px-4 rounded-xl gold-gradient-bg text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span className="font-myanmar font-bold">
                  {isUploading ? 'Upload တင်နေသည်...' : 'AH NYI သို့ တင်မည်'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
