import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  RefreshCw, 
  X, 
  Download, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Square, 
  Play, 
  Smartphone, 
  FolderOpen,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  Radio
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoRecorded: (videoDataUrl: string, durationSeconds: number, caption?: string) => void;
}

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onVideoRecorded,
}) => {
  const { t } = useTranslation();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedPlayerRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryVideoInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('video/mp4');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoCaption, setVideoCaption] = useState<string>('');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [hasAudio, setHasAudio] = useState<boolean>(true);
  const [filterEffect, setFilterEffect] = useState<'normal' | 'warm' | 'cool' | 'vintage'>('normal');

  const timerIntervalRef = useRef<any>(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Sync stream to video preview element whenever stream changes or modal mounts
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Auto-play was blocked or prevented:', err);
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, isOpen, recordedVideoUrl]);

  useEffect(() => {
    if (isOpen && !recordedVideoUrl) {
      startCamera();
    }
    return () => {
      stopAllMedia();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
    setPermissionError(null);
    stopAllMedia();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsLoading(false);
      setPermissionError('သင့် Browser တွင် တိုက်ရိုက်ကင်မရာ API ကို ကန့်သတ်ထားပါသည်။ ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်ကူးပါ');
      return;
    }

    // Constraint Fallback Ladder
    const constraintAttempts: MediaStreamConstraints[] = [
      // 1. Ideal facing + standard HD + audio
      {
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      },
      // 2. Direct facing string + audio
      {
        video: { facingMode: facingMode },
        audio: true,
      },
      // 3. Any video + audio
      {
        video: true,
        audio: true,
      },
      // 4. Ideal facing without audio (in case microphone is blocked/absent)
      {
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      },
      // 5. Minimal video only
      {
        video: true,
        audio: false,
      },
    ];

    let mediaStream: MediaStream | null = null;
    let audioEnabled = true;

    for (let i = 0; i < constraintAttempts.length; i++) {
      try {
        const constraints = constraintAttempts[i];
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        audioEnabled = !!constraints.audio;
        break;
      } catch (err) {
        console.warn(`Camera attempt ${i + 1} failed:`, err);
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      setHasAudio(audioEnabled);
      setIsLoading(false);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true;
        videoPreviewRef.current.play().catch(console.warn);
      }
    } else {
      setIsLoading(false);
      setPermissionError(
        'ဖုန်းကင်မရာ ခွင့်ပြုချက် တောင်းခံမှု မအောင်မြင်ပါ။ စိတ်မပူပါနှင့်၊ အောက်ပါ "ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်မည်" ခလုတ်ကို နှိပ်၍ အလွယ်တကူ ဗီဒီယို ရိုက်ကူးနိုင်ပါသည်'
      );
    }
  };

  const stopAllMedia = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (e) {}
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/quicktime',
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  };

  const startRecording = () => {
    if (!stream) {
      startCamera();
      return;
    }

    setRecordedChunks([]);
    setRecordingSeconds(0);

    try {
      const mime = getSupportedMimeType();
      setRecordedMimeType(mime || 'video/mp4');

      const options = mime ? { mimeType: mime } : undefined;
      const recorder = new MediaRecorder(stream, options);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const finalType = mime || chunks[0]?.type || 'video/mp4';
        const blob = new Blob(chunks, { type: finalType });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setRecordedChunks(chunks);
        setRecordedMimeType(finalType);
      };

      // timeslice 1000ms ensures periodic data capture
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('MediaRecorder start error:', err);
      nativeCameraInputRef.current?.click();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder || !isRecording) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordedDuration(recordingSeconds || 5);

    try {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
        mediaRecorder.stop();
      }
    } catch (e) {
      console.warn('Error stopping mediaRecorder:', e);
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Handle native camera capture or gallery video selection
  const handleNativeVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setPermissionError(null);
    stopAllMedia();

    const mime = file.type || 'video/mp4';
    setRecordedMimeType(mime);

    const tempUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = tempUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration) || 5;
      setRecordedDuration(dur);
    };

    const reader = new FileReader();
    reader.onloadend = () => {
      setRecordedVideoUrl(tempUrl);
      setRecordedChunks([file]);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
      setPermissionError('ဗီဒီယိုဖိုင် ဖတ်ရှု၍ မရပါ။ ပြန်လည်ကြိုးစားပေးပါ');
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // Generate an instant animated canvas demo test video
  const handleUseTestSampleVideo = () => {
    setIsLoading(true);
    setPermissionError(null);
    stopAllMedia();

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const stream = canvas.captureStream(30);
      const mime = getSupportedMimeType() || 'video/webm';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setRecordedChunks(chunks);
        setRecordedMimeType(mime);
        setRecordedDuration(5);
        setIsLoading(false);
      };

      recorder.start();

      let frame = 0;
      const render = () => {
        frame++;
        const grad = ctx.createLinearGradient(0, 0, 720, 1280);
        grad.addColorStop(0, '#0B0E14');
        grad.addColorStop(0.5, '#1E2538');
        grad.addColorStop(1, '#0B0E14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 720, 1280);

        // Gold pulsing circle
        const radius = 120 + Math.sin(frame * 0.1) * 20;
        ctx.beginPath();
        ctx.arc(360, 500, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#F6D365';
        ctx.stroke();

        // Logo text
        ctx.font = 'bold 52px sans-serif';
        ctx.fillStyle = '#F6D365';
        ctx.textAlign = 'center';
        ctx.fillText('AH NYI LIVE VIDEO', 360, 490);

        ctx.font = '28px Myanmar3, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('မြန်မာ့ကိုယ်ပိုင် လူမှုကွန်ရက်', 360, 545);

        ctx.font = 'bold 36px monospace';
        ctx.fillStyle = '#E5E7EB';
        ctx.fillText(`HD 1080p • 00:0${Math.floor(frame / 30)}`, 360, 700);

        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#9CA3AF';
        ctx.fillText('Live Camera Stream Test Video', 360, 760);

        if (frame < 150) {
          requestAnimationFrame(render);
        } else {
          recorder.stop();
        }
      };
      render();
    } catch (err) {
      setIsLoading(false);
      console.error('Test video generation failed:', err);
    }
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedChunks([]);
    setRecordingSeconds(0);
    setRecordedDuration(0);
    setSaveSuccess(false);
    setIsPlayingPreview(false);
    startCamera();
  };

  const handleSaveToDevice = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    const ext = recordedMimeType.includes('webm') ? 'webm' : 'mp4';
    a.download = `AH_NYI_VIDEO_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePost = async () => {
    if (!recordedVideoUrl || recordedChunks.length === 0) return;
    setIsLoading(true);
    const blob = new Blob(recordedChunks, { type: recordedMimeType || 'video/mp4' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      onVideoRecorded(base64Data, recordedDuration || recordingSeconds || 5, videoCaption);
      setIsLoading(false);
      handleClose();
    };
    reader.readAsDataURL(blob);
  };

  const handleClose = () => {
    stopAllMedia();
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedChunks([]);
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordedDuration(0);
    setPermissionError(null);
    onClose();
  };

  const toggleFacingMode = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const togglePreviewPlay = () => {
    if (!recordedPlayerRef.current) return;
    if (isPlayingPreview) {
      recordedPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      recordedPlayerRef.current.play().catch(console.warn);
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const filterStyle = () => {
    switch (filterEffect) {
      case 'warm': return 'sepia(25%) saturate(140%) contrast(105%)';
      case 'cool': return 'hue-rotate(190deg) saturate(110%)';
      case 'vintage': return 'sepia(50%) contrast(120%) brightness(95%)';
      default: return 'none';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4">
      {/* Hidden Native Camera & Gallery file inputs */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeVideoSelected}
      />
      <input
        ref={galleryVideoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleNativeVideoSelected}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#121620] border border-[#D4AF37]/35 shadow-2xl flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B0E14]/90">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <Video className="w-5 h-5 text-[#F6D365]" />
            <h3 className="font-semibold text-base sm:text-lg text-white font-myanmar flex items-center gap-1.5">
              <span>{t('videoCameraTitle')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/30 text-red-300 font-mono uppercase tracking-wider border border-red-500/40">
                LIVE CAM
              </span>
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewport / Recording Screen */}
        <div className="relative w-full aspect-[9/16] max-h-[58vh] bg-black flex items-center justify-center overflow-hidden">
          {permissionError ? (
            <div className="flex flex-col items-center text-center p-6 text-amber-200 max-w-md overflow-y-auto">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-[#F6D365] animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-white text-base mb-1 font-myanmar">တိုက်ရိုက်ကင်မရာ အသင့်ဖြစ်နေပါပြီ</h4>
              <p className="font-myanmar text-xs leading-relaxed mb-4 text-gray-300">
                {permissionError}
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                {/* 1. Native Phone Camcorder (100% Guaranteed on phone) */}
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-3.5 px-4 rounded-xl gold-gradient-bg text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="font-myanmar font-bold">ဖုန်းကင်မရာ အက်ပ်ဖြင့် ဗီဒီယိုရိုက်မည်</span>
                </button>

                {/* 2. Open in Dedicated Tab (if in iframe) */}
                {isInIframe && (
                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition border border-blue-400/30"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-myanmar">Browser အပြည့်ဖြင့် ကင်မရာဖွင့်ရန် နှိပ်ပါ</span>
                  </button>
                )}

                {/* 3. Generate instant test video */}
                <button
                  onClick={handleUseTestSampleVideo}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-medium text-xs flex items-center justify-center gap-2 transition border border-purple-500/30"
                >
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span className="font-myanmar">ကင်မရာ စမ်းသပ်ဗီဒီယို အလိုအလျောက် သုံးမည်</span>
                </button>

                {/* 4. Pick from Gallery */}
                <button
                  onClick={() => galleryVideoInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <FolderOpen className="w-4 h-4 text-[#F6D365]" />
                  <span className="font-myanmar">ဖုန်းထဲမှ ဗီဒီယိုဖိုင် ရွေးချယ်မည်</span>
                </button>

                <button
                  onClick={startCamera}
                  className="w-full py-2 px-3 text-xs text-gray-400 hover:text-white transition font-myanmar"
                >
                  {t('retake')} (ကင်မရာ ပြန်ဖွင့်မည်)
                </button>
              </div>
            </div>
          ) : recordedVideoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={recordedPlayerRef}
                src={recordedVideoUrl}
                playsInline
                loop
                className="w-full h-full object-cover"
                style={{ filter: filterStyle() }}
                onPlay={() => setIsPlayingPreview(true)}
                onPause={() => setIsPlayingPreview(false)}
              />
              <button
                onClick={togglePreviewPlay}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition group"
              >
                {!isPlayingPreview ? (
                  <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-xl group-hover:scale-110 transition">
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </div>
                ) : null}
              </button>

              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono border border-white/15">
                ⏱️ {formatTime(recordedDuration || recordingSeconds || 5)}
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0E14] z-20">
                  <RefreshCw className="w-9 h-9 text-[#D4AF37] animate-spin mb-3" />
                  <p className="text-xs text-gray-300 font-myanmar">{t('requestingPermission')}</p>
                  <span className="text-[11px] text-[#F6D365] mt-1 font-mono">Connecting Camera...</span>
                </div>
              )}

              {/* LIVE Viewfinder Video */}
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

              {/* Status Badge Top Left */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-[11px] text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-emerald-400 font-semibold">LIVE</span>
                </div>
                {!hasAudio && !isRecording && (
                  <div className="px-2 py-1 rounded-full bg-amber-500/30 backdrop-blur-md border border-amber-400/30 text-[10px] text-amber-300 flex items-center gap-1">
                    <VolumeX className="w-3 h-3" />
                    <span>No Mic</span>
                  </div>
                )}
              </div>

              {/* Controls on camera view (Top Right) */}
              {!isRecording && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                  <button
                    onClick={toggleFacingMode}
                    className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 active:scale-95 transition shadow-lg"
                    title={t('flipCamera')}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="p-2.5 rounded-full bg-[#D4AF37] text-black hover:bg-[#F6D365] active:scale-95 transition shadow-lg"
                    title="ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်မည်"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const filters: ('normal' | 'warm' | 'cool' | 'vintage')[] = ['normal', 'warm', 'cool', 'vintage'];
                      const next = filters[(filters.indexOf(filterEffect) + 1) % filters.length];
                      setFilterEffect(next);
                    }}
                    className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 text-white active:scale-95 transition shadow-lg ${
                      filterEffect !== 'normal' ? 'bg-[#D4AF37]/80 text-black' : 'bg-black/60'
                    }`}
                    title="Filters"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Recording indicator & timer */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600 text-white font-mono text-sm shadow-xl backdrop-blur-md animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>REC {formatTime(recordingSeconds)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-[#0B0E14] border-t border-white/10 flex flex-col gap-3">
          {recordedVideoUrl ? (
            <div className="space-y-3">
              <input
                type="text"
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                placeholder="ဗီဒီယိုအတွက် စာတို ရေးသားပါ... #AhNyi #Video"
                className="w-full text-xs bg-[#1A1F2C] border border-white/10 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />

              {saveSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-myanmar">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{t('videoSavedSuccess')}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="font-myanmar">{t('retake')}</span>
                </button>

                <button
                  onClick={handleSaveToDevice}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#F6D365]" />
                  <span className="font-myanmar">{t('saveToDevice')}</span>
                </button>

                <button
                  onClick={handlePost}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="font-myanmar">{t('postToAhNyi')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-around py-1">
              {/* Native Camcorder Trigger */}
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                disabled={isRecording}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-myanmar">ဖုန်းကင်မရာ</span>
              </button>

              {/* Main Record Button */}
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="relative group p-1 active:scale-95 transition"
                  title={t('startRecord')}
                >
                  <div className="w-18 h-18 rounded-full border-4 border-red-500/50 flex items-center justify-center group-hover:border-red-400 transition">
                    <div className="w-14 h-14 rounded-full bg-red-600 group-hover:bg-red-500 shadow-xl transition" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="relative group p-1 active:scale-95 transition animate-pulse"
                  title={t('stopRecord')}
                >
                  <div className="w-18 h-18 rounded-full border-4 border-red-500 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-md bg-red-600 shadow-xl" />
                  </div>
                </button>
              )}

              {/* Gallery Pick */}
              <button
                onClick={() => galleryVideoInputRef.current?.click()}
                disabled={isRecording}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-[#F6D365]" />
                </div>
                <span className="text-[10px] font-myanmar">Gallery</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
