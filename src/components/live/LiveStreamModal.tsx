import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  X, 
  RefreshCw, 
  Heart, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Users, 
  Flame, 
  Crown, 
  CheckCircle,
  Share2,
  Video,
  Smartphone,
  Eye
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { User, Post } from '../../types';
import { storage } from '../../services/storage';

interface LiveStreamModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onStreamEndedAndPublished: () => void;
}

interface LiveComment {
  id: string;
  sender: string;
  text: string;
  isHost?: boolean;
}

interface FloatingHeart {
  id: number;
  emoji: string;
  left: number;
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onStreamEndedAndPublished,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const nativeCamcorderRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isBeautyOn, setIsBeautyOn] = useState<boolean>(true);

  // Broadcast state
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastSeconds, setBroadcastSeconds] = useState<number>(0);
  const [viewerCount, setViewerCount] = useState<number>(185);
  const [totalLikes, setTotalLikes] = useState<number>(420);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  
  // Chat state
  const [comments, setComments] = useState<LiveComment[]>([
    { id: '1', sender: 'Ko Thura (ရန်ကုန်)', text: 'မင်္ဂလာပါ AH NYI Live စောင့်ကြည့်နေပါတယ်! 👏' },
    { id: '2', sender: 'Ma Hnin (မန္တလေး)', text: 'အသံနဲ့ ကင်မရာ အရမ်းကြည်တယ်နော် ❤️' },
    { id: '3', sender: 'Kyaw Zin (နေပြည်တော်)', text: 'Follow လုပ်ထားတယ် အစ်ကို/အမ 🔥' },
  ]);
  const [commentInput, setCommentInput] = useState<string>('');

  // Finished summary
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isSavingPost, setIsSavingPost] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Sync stream to video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.play().catch(console.warn);
    } else {
      video.srcObject = null;
    }
  }, [stream, isOpen, isSummaryOpen]);

  // Start camera on modal open
  useEffect(() => {
    if (isOpen && !isSummaryOpen) {
      startCamera();
      setIsBroadcasting(true);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Live Timer and Viewer count simulation
  useEffect(() => {
    if (!isBroadcasting) return;

    const timer = setInterval(() => {
      setBroadcastSeconds((prev) => prev + 1);
    }, 1000);

    // Fluctuate viewer count naturally
    const viewerTimer = setInterval(() => {
      setViewerCount((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(120, prev + delta);
      });
    }, 4000);

    // Simulated incoming comments from Myanmar users
    const sampleComments = [
      { sender: 'Aung Ko', text: 'Live ဗီဒီယို အရမ်းမိုက်တယ် ✨' },
      { sender: 'Su Myat', text: 'အားပေးနေပါတယ်ရှင့် ❤️❤️' },
      { sender: 'Min Thu', text: 'AH NYI မှာ Live လွှင့်ရတာ အဆင်ပြေလားခင်ဗျာ' },
      { sender: 'Ei Phyu', text: 'သီချင်းလေး ဆိုပြပါဦး 🎶' },
      { sender: 'Nay Lin', text: 'Like ပေးလိုက်ပါပြီ 👍' },
      { sender: 'Moe Moe', text: 'စကားပြောတာ ချစ်စရာလေး 👑' },
    ];

    const commentInterval = setInterval(() => {
      const randomMsg = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      setComments((prev) => [
        ...prev.slice(-15),
        {
          id: String(Date.now()),
          sender: randomMsg.sender,
          text: randomMsg.text,
        },
      ]);
      // Also spawn floating heart occasionally
      spawnFloatingHeart(['❤️', '🔥', '👑', '✨'][Math.floor(Math.random() * 4)]);
      setTotalLikes((prev) => prev + 1);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(viewerTimer);
      clearInterval(commentInterval);
    };
  }, [isBroadcasting]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const startCamera = async () => {
    setPermissionError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('သင့် Browser တွင် တိုက်ရိုက်ကင်မရာ အသုံးပြုခွင့် မရသေးပါ။');
      return;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true },
      { video: { facingMode: facingMode }, audio: true },
      { video: true, audio: true },
      { video: true, audio: false },
    ];

    let mediaStream: MediaStream | null = null;
    for (const attempt of attempts) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(attempt);
        break;
      } catch (e) {
        console.warn('Live stream getUserMedia attempt failed:', e);
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.warn);
      }
    } else {
      setPermissionError('ကင်မရာ အသုံးပြုခွင့် မရသေးပါ။ ဖုန်းကင်မရာဖြင့် အသုံးပြုနိုင်ပါသည်');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleMic = () => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMicMuted((prev) => !prev);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const spawnFloatingHeart = (emoji: string = '❤️') => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingHearts((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setComments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: currentUser.name,
        text: commentInput.trim(),
        isHost: true,
      },
    ]);
    setCommentInput('');
  };

  const handleEndStream = () => {
    setIsBroadcasting(false);
    stopCamera();
    setIsSummaryOpen(true);
  };

  const handlePublishReplayPost = async () => {
    setIsSavingPost(true);
    try {
      const newPost: Post = {
        id: `post_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatar,
        authorVerified: currentUser.isVerified,
        authorRole: currentUser.role,
        type: 'video',
        mediaUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1080&q=80',
        mediaDuration: broadcastSeconds || 60,
        caption: `🔴 AH NYI LIVE Video Replay (${formatTime(broadcastSeconds)}) - တိုက်ရိုက်လွှင့်ခဲ့ပြီးသော ဗီဒီယိုဖြစ်ပါသည်။ စုစုပေါင်း ကြည့်ရှုသူ ${viewerCount} ဦး ရောက်ရှိခဲ့သည်။`,
        hashtags: ['#AhNyiLive', '#LiveStream', '#Myanmar', '#LiveReplay'],
        likes: [],
        likesCount: totalLikes,
        commentsCount: comments.length,
        sharesCount: 14,
        viewsCount: viewerCount * 2,
        createdAt: new Date().toISOString(),
        privacy: 'public',
      };

      await storage.createPost(newPost);
      await storage.updateUser(currentUser.id, {
        postsCount: (currentUser.postsCount || 0) + 1,
      });

      setIsSavingPost(false);
      handleClose();
      onStreamEndedAndPublished();
    } catch (err) {
      setIsSavingPost(false);
      console.error('Failed to save live replay post:', err);
    }
  };

  const handleClose = () => {
    stopCamera();
    setIsBroadcasting(false);
    setIsSummaryOpen(false);
    setBroadcastSeconds(0);
    onClose();
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Hidden native cam input */}
      <input
        ref={nativeCamcorderRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={() => {
          setIsBroadcasting(true);
        }}
      />

      <div className="relative w-full h-full max-w-lg max-h-[100dvh] bg-[#0B0E14] flex flex-col overflow-hidden sm:rounded-3xl border border-[#D4AF37]/30 shadow-2xl">
        {/* If Broadcast Ended Summary */}
        {isSummaryOpen ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-gradient-to-b from-[#121620] to-[#0B0E14]">
            <div className="w-20 h-20 rounded-full gold-gradient-bg flex items-center justify-center text-black shadow-2xl animate-bounce">
              <Radio className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white font-myanmar">Live ထုတ်လွှင့်မှု ပြီးဆုံးပါပြီ!</h3>
              <p className="text-xs text-gray-400 font-myanmar">
                သင်၏ တိုက်ရိုက်ထုတ်လွှင့်မှု အချက်အလက်များ
              </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm bg-[#1A1F2C] p-4 rounded-2xl border border-white/10">
              <div className="text-center">
                <span className="text-[11px] text-gray-400 block font-myanmar">အချိန်ကြာချိန်</span>
                <span className="font-mono text-lg font-bold text-[#F6D365]">{formatTime(broadcastSeconds)}</span>
              </div>
              <div className="text-center border-x border-white/10">
                <span className="text-[11px] text-gray-400 block font-myanmar">ကြည့်ရှုသူ</span>
                <span className="font-mono text-lg font-bold text-white">{viewerCount}</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] text-gray-400 block font-myanmar">Likes ရရှိမှု</span>
                <span className="font-mono text-lg font-bold text-red-400">{totalLikes}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-sm pt-4">
              <button
                onClick={handlePublishReplayPost}
                disabled={isSavingPost}
                className="w-full py-3.5 px-4 rounded-xl gold-gradient-bg text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-myanmar font-bold">
                  {isSavingPost ? 'Feed သို့ တင်နေပါသည်...' : 'ဗီဒီယိုအဖြစ် Feed တွင် တင်မည်'}
                </span>
              </button>

              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs font-myanmar transition"
              >
                ပြီးဆုံးမည်
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live Camera Viewport */}
            <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
              {permissionError ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-amber-200 z-10 max-w-xs">
                  <Radio className="w-12 h-12 text-[#F6D365] mb-3 animate-pulse" />
                  <p className="font-myanmar text-xs mb-4 text-gray-300">{permissionError}</p>
                  <button
                    onClick={() => nativeCamcorderRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>ဖုန်းကင်မရာဖြင့် ဖွင့်မည်</span>
                  </button>
                </div>
              ) : (
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
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  style={{
                    filter: isBeautyOn ? 'contrast(105%) brightness(108%) saturate(115%)' : 'none',
                  }}
                />
              )}

              {/* Floating Hearts Animation overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {floatingHearts.map((heart) => (
                  <div
                    key={heart.id}
                    className="absolute bottom-20 text-3xl animate-bounce"
                    style={{
                      left: `${heart.left}%`,
                      animation: 'floatUp 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                    }}
                  >
                    {heart.emoji}
                  </div>
                ))}
              </div>

              {/* Top Bar: LIVE badge, Viewer Count, Host Info, Close */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Host Info */}
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                      <span className="text-[9px] text-[#F6D365] leading-tight font-mono">HOST</span>
                    </div>
                  </div>

                  {/* Red LIVE Badge */}
                  <div className="px-2.5 py-1 rounded-full bg-red-600 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>LIVE</span>
                  </div>

                  {/* Viewer Count */}
                  <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white font-mono text-xs flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{viewerCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-full bg-black/50 text-[11px] font-mono text-gray-200">
                    ⏱️ {formatTime(broadcastSeconds)}
                  </div>

                  <button
                    onClick={handleEndStream}
                    className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white transition shadow-lg"
                    title="Live အဆုံးသတ်မည်"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Right Side Host Quick Tools */}
              <div className="absolute right-3 bottom-32 z-30 flex flex-col gap-3">
                <button
                  onClick={toggleFacingMode}
                  className="p-3 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 active:scale-95 transition shadow-lg"
                  title="ရှေ့/နောက် ကင်မရာ ပြောင်းမည်"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full backdrop-blur-md border active:scale-95 transition shadow-lg ${
                    isMicMuted
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="မိုက်ခရိုဖုန်း ဖွင့်/ပိတ်"
                >
                  {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setIsBeautyOn((prev) => !prev)}
                  className={`p-3 rounded-full backdrop-blur-md border active:scale-95 transition shadow-lg ${
                    isBeautyOn
                      ? 'bg-[#D4AF37] text-black border-[#F6D365]'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="Beauty Filter"
                >
                  <Sparkles className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    spawnFloatingHeart('❤️');
                    setTotalLikes((prev) => prev + 1);
                  }}
                  className="p-3 rounded-full bg-red-600/90 text-white shadow-xl hover:scale-110 active:scale-95 transition"
                  title="Like ပေးမည်"
                >
                  <Heart className="w-5 h-5 fill-white" />
                </button>
              </div>

              {/* Live Comments Waterfall Area (Bottom Left) */}
              <div className="absolute bottom-16 left-3 right-16 max-h-48 overflow-y-auto no-scrollbar z-20 space-y-2 pointer-events-auto">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`inline-flex items-center gap-2 max-w-[90%] px-3 py-1.5 rounded-2xl backdrop-blur-md text-xs border ${
                      c.isHost
                        ? 'bg-[#D4AF37]/30 border-[#D4AF37]/60 text-[#F6D365]'
                        : 'bg-black/55 border-white/10 text-white'
                    }`}
                  >
                    <span className="font-semibold text-amber-300 text-[11px] shrink-0">
                      {c.sender}:
                    </span>
                    <span className="text-gray-100 font-myanmar break-words">{c.text}</span>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {/* Bottom Input & Host Broadcast Actions */}
            <div className="p-3 bg-black/90 border-t border-white/10 flex items-center gap-2 z-30">
              <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="တိုက်ရိုက် Live တွင် စကားပြောပါ..."
                  className="flex-1 text-xs bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-2.5 rounded-full gold-gradient-bg text-black disabled:opacity-40 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <button
                onClick={handleEndStream}
                className="px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold font-myanmar transition shrink-0"
              >
                Live ရပ်မည်
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-220px) scale(1.4);
          }
        }
      `}</style>
    </div>
  );
};
