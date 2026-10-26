import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  X, 
  Download, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Smartphone, 
  FolderOpen,
  Sparkles,
  ExternalLink,
  Edit3,
  Check
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { Post, User } from '../../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoDataUrl: string, caption?: string) => void;
  currentUser?: User;
  onPostDirectlyCreated?: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  currentUser,
  onPostDirectlyCreated,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const nativeSelfieInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isDirectPosting, setIsDirectPosting] = useState<boolean>(false);
  const [directPostSuccess, setDirectPostSuccess] = useState<boolean>(false);
  const [filterEffect, setFilterEffect] = useState<'normal' | 'warm' | 'cool' | 'glam'>('normal');

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Sync stream to video element
  useEffect(() => {
    const video = videoRef.current;
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
          console.warn('Video auto-play prevented:', err);
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, isOpen, capturedImage]);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
    setPermissionError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsLoading(false);
      setPermissionError('သင့် Browser တွင် တိုက်ရိုက်ကင်မရာ API ကို ကန့်သတ်ထားပါသည်။ ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်ကူးပါ');
      return;
    }

    // Standard mobile-friendly constraints matching VideoRecorderModal
    const constraintAttempts: MediaStreamConstraints[] = [
      {
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      },
      {
        video: { facingMode: facingMode },
        audio: false,
      },
      {
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let mediaStream: MediaStream | null = null;
    for (let i = 0; i < constraintAttempts.length; i++) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraintAttempts[i]);
        break;
      } catch (err) {
        console.warn(`Camera attempt ${i + 1} failed:`, err);
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      setIsLoading(false);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.warn);
      }
    } else {
      setIsLoading(false);
      setPermissionError(
        'ဖုန်းကင်မရာ ခွင့်ပြုချက် တောင်းခံမှု မအောင်မြင်ပါ။ စိတ်မပူပါနှင့်၊ အောက်ပါ "ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်မည်" ခလုတ်ကို နှိပ်၍ အလွယ်တကူ ဓာတ်ပုံရိုက်ကူးနိုင်ပါသည်'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // High-reliability snapshot capture
  const handleCapture = async () => {
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    // Method 1: ImageCapture API (best for Chrome & Android hardware cameras)
    if (typeof (window as any).ImageCapture !== 'undefined' && stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live') {
        try {
          const imageCapture = new (window as any).ImageCapture(videoTrack);
          const blob = await imageCapture.takePhoto();
          const reader = new FileReader();
          reader.onload = () => {
            setCapturedImage(reader.result as string);
            stopCamera();
          };
          reader.readAsDataURL(blob);
          return;
        } catch (imgCapErr) {
          console.warn('ImageCapture.takePhoto failed, falling back to Canvas drawImage:', imgCapErr);
        }
      }
    }

    // Method 2: HTML5 Canvas drawImage
    try {
      const video = videoRef.current;
      if (!video) {
        nativeCameraInputRef.current?.click();
        return;
      }

      const canvas = document.createElement('canvas');
      const w = video.videoWidth > 0 ? video.videoWidth : 1280;
      const h = video.videoHeight > 0 ? video.videoHeight : 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      if (facingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      try {
        if (filterEffect === 'warm') {
          ctx.filter = 'sepia(25%) saturate(140%) contrast(105%)';
        } else if (filterEffect === 'cool') {
          ctx.filter = 'hue-rotate(190deg) saturate(110%)';
        } else if (filterEffect === 'glam') {
          ctx.filter = 'brightness(105%) contrast(110%) saturate(130%)';
        }
      } catch (filterErr) {
        console.warn('Canvas filter not supported:', filterErr);
      }

      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      setCapturedImage(dataUrl);
      stopCamera();
    } catch (err: any) {
      console.error('handleCapture failed, triggering native phone camera:', err);
      nativeCameraInputRef.current?.click();
    }
  };

  // Handle native camera capture or gallery selection
  const handleNativeImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setPermissionError(null);
    stopCamera();

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
      setPermissionError('ဓာတ်ပုံဖိုင် ဖတ်ရှု၍ မရပါ။ ပြန်လည်ကြိုးစားပေးပါ');
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // Generate an instant high-res test photo
  const handleUseTestSamplePhoto = () => {
    setIsLoading(true);
    setPermissionError(null);
    stopCamera();

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#0B0E14');
    grad.addColorStop(0.5, '#1E2538');
    grad.addColorStop(1, '#0B0E14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Gold rings
    ctx.beginPath();
    ctx.arc(540, 480, 220, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#F6D365';
    ctx.stroke();

    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#F6D365';
    ctx.textAlign = 'center';
    ctx.fillText('AH NYI CAMERA', 540, 470);

    ctx.font = '36px Myanmar3, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('တိုက်ရိုက်ကင်မရာ ဓာတ်ပုံစမ်းသပ်မှု', 540, 540);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(new Date().toLocaleDateString('my-MM', { dateStyle: 'full' }), 540, 720);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    setIsLoading(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSaveSuccess(false);
    setDirectPostSuccess(false);
    startCamera();
  };

  const handleSaveToDevice = () => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `AH_NYI_PHOTO_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Option 1: Open in Post Creator modal to customize hashtags/privacy/text
  const handleEditAndPost = () => {
    if (!capturedImage) return;
    onPhotoCaptured(capturedImage, photoCaption);
    handleClose();
  };

  // Option 2: 1-Click Instant Post to AH NYI Feed
  const handleDirectPostNow = async () => {
    if (!capturedImage) return;
    setIsDirectPosting(true);

    try {
      if (currentUser) {
        const newPost: Post = {
          id: `post_photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorHandle: currentUser.handle,
          authorAvatar: currentUser.avatar,
          authorVerified: currentUser.isVerified,
          authorRole: currentUser.role,
          type: 'photo',
          mediaUrl: capturedImage,
          caption: photoCaption.trim() || '📸 AH NYI ကင်မရာဖြင့် ရိုက်ကူးထားသော ဓာတ်ပုံ #AhNyi #Photo',
          hashtags: ['#AhNyi', '#Photo', '#Camera', '#Myanmar'],
          likes: [],
          likesCount: 1,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 1,
          createdAt: new Date().toISOString(),
          privacy: 'public',
        };

        await storage.createPost(newPost);
        await storage.updateUser(currentUser.id, {
          postsCount: (currentUser.postsCount || 0) + 1,
        });

        setDirectPostSuccess(true);
        setTimeout(() => {
          setIsDirectPosting(false);
          handleClose();
          if (onPostDirectlyCreated) {
            onPostDirectlyCreated();
          }
        }, 600);
      } else {
        // Fallback to onPhotoCaptured
        onPhotoCaptured(capturedImage, photoCaption);
        handleClose();
      }
    } catch (err) {
      console.error('Direct post failed, opening editor:', err);
      setIsDirectPosting(false);
      onPhotoCaptured(capturedImage, photoCaption);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setPermissionError(null);
    setDirectPostSuccess(false);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const filterStyle = () => {
    switch (filterEffect) {
      case 'warm': return 'sepia(25%) saturate(140%) contrast(105%)';
      case 'cool': return 'hue-rotate(190deg) saturate(110%)';
      case 'glam': return 'brightness(105%) contrast(110%) saturate(130%)';
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
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeImageSelected}
      />
      <input
        ref={nativeSelfieInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleNativeImageSelected}
      />
      <input
        ref={galleryImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleNativeImageSelected}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#121620] border border-[#D4AF37]/35 shadow-2xl flex flex-col max-h-[96vh]">
        {/* Flash Animation Overlay */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200 pointer-events-none" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0B0E14]/90">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <Camera className="w-5 h-5 text-[#F6D365]" />
            <h3 className="font-semibold text-base sm:text-lg text-white font-myanmar flex items-center gap-1.5">
              <span>{t('cameraTitle')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-mono uppercase tracking-wider border border-emerald-500/40">
                LIVE
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

        {/* Viewport / Captured Screen */}
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
                {/* 1. Native Phone Rear Camera */}
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl gold-gradient-bg text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="font-myanmar font-bold">ဖုန်းကင်မရာ အက်ပ်ဖြင့် ဓာတ်ပုံရိုက်မည်</span>
                </button>

                {/* 2. Native Phone Selfie Camera */}
                <button
                  onClick={() => nativeSelfieInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span className="font-myanmar">Selfie (ရှေ့ကင်မရာ) ဖြင့် ရိုက်မည်</span>
                </button>

                {/* 3. Open in Dedicated Tab (if in iframe) */}
                {isInIframe && (
                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition border border-blue-400/30"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-myanmar">Browser အပြည့်ဖြင့် ကင်မရာဖွင့်ရန် နှိပ်ပါ</span>
                  </button>
                )}

                {/* 4. Generate instant test photo */}
                <button
                  onClick={handleUseTestSamplePhoto}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-medium text-xs flex items-center justify-center gap-2 transition border border-purple-500/30"
                >
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span className="font-myanmar">ကင်မရာ စမ်းသပ်ဓာတ်ပုံ အလိုအလျောက် သုံးမည်</span>
                </button>

                {/* 5. Pick from Gallery */}
                <button
                  onClick={() => galleryImageInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <FolderOpen className="w-4 h-4 text-[#F6D365]" />
                  <span className="font-myanmar">ဖုန်းထဲမှ ဓာတ်ပုံရွေးချယ်မည်</span>
                </button>

                <button
                  onClick={startCamera}
                  className="w-full py-2 px-3 text-xs text-gray-400 hover:text-white transition font-myanmar"
                >
                  {t('retake')} (ကင်မရာ ပြန်ဖွင့်မည်)
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
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

              {/* LIVE Camera Video Viewfinder */}
              <video
                ref={videoRef}
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
              </div>

              {/* Controls on camera view (Top Right) */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                <button
                  onClick={toggleFacingMode}
                  className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 active:scale-95 transition shadow-lg"
                  title={t('flipCamera')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (facingMode === 'user') {
                      nativeSelfieInputRef.current?.click();
                    } else {
                      nativeCameraInputRef.current?.click();
                    }
                  }}
                  className="p-2.5 rounded-full bg-[#D4AF37] text-black hover:bg-[#F6D365] active:scale-95 transition shadow-lg"
                  title="ဖုန်းကင်မရာ အက်ပ်ဖြင့် ရိုက်မည်"
                >
                  <Smartphone className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const filters: ('normal' | 'warm' | 'cool' | 'glam')[] = ['normal', 'warm', 'cool', 'glam'];
                    const next = filters[(filters.indexOf(filterEffect) + 1) % filters.length];
                    setFilterEffect(next);
                  }}
                  className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 text-white active:scale-95 transition shadow-lg ${
                    filterEffect !== 'normal' ? 'bg-[#D4AF37]/80 text-black' : 'bg-black/60'
                  }`}
                  title="Filter Effects"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-[#0B0E14] border-t border-white/10 flex flex-col gap-3">
          {capturedImage ? (
            <div className="space-y-3">
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="ဓာတ်ပုံအတွက် စာတို ရေးသားပါ... #AhNyi #Photo"
                className="w-full text-xs bg-[#1A1F2C] border border-white/10 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />

              {saveSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-myanmar">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{t('photoSavedSuccess')}</span>
                </div>
              )}

              {directPostSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-myanmar">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>ဓာတ်ပုံကို Feed သို့ အောင်မြင်စွာ တင်ပြီးပါပြီ!</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={handleRetake}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="font-myanmar">{t('retake')}</span>
                </button>

                <button
                  onClick={handleSaveToDevice}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#F6D365]" />
                  <span className="font-myanmar">{t('saveToDevice')}</span>
                </button>

                <button
                  onClick={handleEditAndPost}
                  className="py-2.5 rounded-xl bg-[#1A1F2C] hover:bg-[#23293A] border border-[#D4AF37]/40 text-[#F6D365] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  title="စာရေးပြီး အသေးစိတ်ပြင်ဆင်တင်မည်"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="font-myanmar">စာရေးတင်မည်</span>
                </button>

                <button
                  onClick={handleDirectPostNow}
                  disabled={isDirectPosting}
                  className="py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition disabled:opacity-50"
                  title="ချက်ချင်း Post တင်မည်"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="font-myanmar font-bold">
                    {isDirectPosting ? 'တင်နေသည်...' : 'တိုက်ရိုက်တင်မည်'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-around py-1">
              {/* Native Cam Trigger (Rear or Selfie based on facingMode) */}
              <button
                onClick={() => {
                  if (facingMode === 'user') {
                    nativeSelfieInputRef.current?.click();
                  } else {
                    nativeCameraInputRef.current?.click();
                  }
                }}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-myanmar">ဖုန်းကင်မရာ</span>
              </button>

              {/* Shutter Button (High-Reliability Photo Capture) */}
              <button
                onClick={handleCapture}
                className="relative group p-1 active:scale-95 transition"
                title={t('takePhoto')}
              >
                <div className="w-18 h-18 rounded-full border-4 border-[#D4AF37] flex items-center justify-center group-hover:scale-105 transition">
                  <div className="w-14 h-14 rounded-full bg-white shadow-xl" />
                </div>
              </button>

              {/* Gallery Pick */}
              <button
                onClick={() => galleryImageInputRef.current?.click()}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition"
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
