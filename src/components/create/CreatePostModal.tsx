import React, { useState, useRef } from 'react';
import { 
  X, 
  Image, 
  Video, 
  Camera, 
  Send, 
  Globe, 
  Users, 
  Lock, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  Hash,
  Play,
  Smartphone,
  Radio
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { Post, User } from '../../types';

interface CreatePostModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onPostCreated: () => void;
  onOpenLiveCamera: () => void;
  onOpenLiveVideo: () => void;
  onOpenGoLive?: () => void;
  initialMedia?: { url: string; type: 'photo' | 'video'; duration?: number; caption?: string } | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onPostCreated,
  onOpenLiveCamera,
  onOpenLiveVideo,
  onOpenGoLive,
  initialMedia,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeVideoInputRef = useRef<HTMLInputElement>(null);
  const nativePhotoInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState<string>('');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'text'>('text');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | undefined>(undefined);
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#AhNyi', '#Myanmar']);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial media if passed from Camera or Video modal
  React.useEffect(() => {
    if (initialMedia) {
      setMediaUrl(initialMedia.url);
      setMediaType(initialMedia.type);
      setMediaDuration(initialMedia.duration);
      if (initialMedia.caption) {
        setCaption(initialMedia.caption);
      }
    }
  }, [initialMedia]);

  const popularTags = ['#AhNyi', '#Myanmar', '#GoldEdition', '#Yangon', '#Bagan', '#Music', '#Creator', '#Viral'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setErrorMsg('Please select a valid image or video file.');
      return;
    }

    if (isVideo) {
      const tempUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = tempUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = Math.round(tempVideo.duration) || 5;
        setMediaDuration(dur);
        URL.revokeObjectURL(tempUrl);
      };
    }

    const reader = new FileReader();
    reader.onloadstart = () => {
      setIsUploading(true);
      setUploadProgress(15);
    };

    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const percent = Math.round((ev.loaded / ev.total) * 90);
        setUploadProgress(percent);
      }
    };

    reader.onloadend = () => {
      const result = reader.result as string;
      setMediaUrl(result);
      setMediaType(isVideo ? 'video' : 'photo');
      setIsUploading(false);
      setUploadProgress(100);
    };

    reader.onerror = () => {
      setIsUploading(false);
      setErrorMsg('Failed to read file from gallery.');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.startsWith('#') ? customTagInput.trim() : `#${customTagInput.trim()}`;
      if (!selectedTags.includes(formatted)) {
        setSelectedTags([...selectedTags, formatted]);
      }
      setCustomTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !mediaUrl) {
      setErrorMsg('Please enter a caption or add a photo/video.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Simulate solid upload steps ensuring persistence
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 95;
          }
          return prev + 25;
        });
      }, 150);

      const newPost: Post = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatar,
        authorVerified: currentUser.isVerified,
        authorRole: currentUser.role,
        type: mediaUrl ? mediaType : 'text',
        mediaUrl: mediaUrl || undefined,
        mediaDuration: mediaDuration,
        caption: caption.trim(),
        hashtags: selectedTags,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 1,
        createdAt: new Date().toISOString(),
        privacy: privacy,
      };

      // Persist directly to IndexedDB
      await storage.createPost(newPost);
      clearInterval(progressTimer);
      setUploadProgress(100);

      // Also update user's post count
      await storage.updateUser(currentUser.id, {
        postsCount: (currentUser.postsCount || 0) + 1
      });

      setTimeout(() => {
        setIsUploading(false);
        handleClose();
        onPostCreated();
      }, 400);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || t('publishError'));
    }
  };

  const handleClose = () => {
    setCaption('');
    setMediaUrl(null);
    setMediaType('text');
    setSelectedTags(['#AhNyi', '#Myanmar']);
    setErrorMsg(null);
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#121620] border border-[#D4AF37]/30 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0E14]/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F6D365]" />
            <h3 className="font-semibold text-lg text-white font-myanmar">
              {t('createTitle')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* User Info & Audience Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-[#D4AF37]/50"
              />
              <div>
                <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                  {currentUser.name}
                  {currentUser.role === 'owner' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40">
                      Owner
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-400">@{currentUser.handle}</p>
              </div>
            </div>

            {/* Privacy Dropdown */}
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="bg-[#1C2230] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="public">{t('privacyPublic')}</option>
              <option value="followers">{t('privacyFollowers')}</option>
              <option value="private">{t('privacyPrivate')}</option>
            </select>
          </div>

          {/* Text Area */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('captionPlaceholder')}
            rows={4}
            className="w-full bg-transparent text-white placeholder-gray-500 border-none focus:outline-none text-base resize-none font-myanmar leading-relaxed"
          />

          {/* Media Preview (if selected or captured) */}
          {mediaUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center group">
              {mediaType === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-[10px] text-white flex items-center gap-1">
                    <Video className="w-3 h-3 text-[#F6D365]" />
                    <span>Video</span>
                  </div>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt="Post preview"
                  className="w-full h-full object-contain"
                />
              )}
              <button
                onClick={() => {
                  setMediaUrl(null);
                  setMediaType('text');
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 bg-[#1C2230] p-3 rounded-2xl border border-[#D4AF37]/30">
              <div className="flex justify-between text-xs text-gray-300 font-myanmar">
                <span>{t('uploadProgress')}</span>
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

          {/* Quick Hashtag Picker */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-[#F6D365]" />
              <span className="font-myanmar">{t('tagsPlaceholder')}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full transition ${
                    selectedTags.includes(tag)
                      ? 'bg-[#D4AF37] text-black font-semibold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              placeholder="Press Enter to add custom hashtag..."
              className="w-full text-xs bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs font-myanmar">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Media Select Buttons (Gallery, Live Camera, Live Video, Go Live, Phone Photo, Phone Video) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#1A1F2C] hover:bg-[#23293A] border border-white/10 transition group text-center"
            >
              <Image className="w-5 h-5 text-[#F6D365] mb-1 group-hover:scale-110 transition" />
              <span className="text-[10px] text-gray-300 font-myanmar">
                {t('uploadFromGallery')}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenLiveCamera();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#1A1F2C] hover:bg-[#23293A] border border-white/10 transition group text-center"
            >
              <Camera className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
              <span className="text-[10px] text-gray-300 font-myanmar">
                တိုက်ရိုက်ကင်မရာ
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenLiveVideo();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#1A1F2C] hover:bg-[#23293A] border border-white/10 transition group text-center"
            >
              <Video className="w-5 h-5 text-red-400 mb-1 group-hover:scale-110 transition" />
              <span className="text-[10px] text-gray-300 font-myanmar">
                {t('recordVideo')}
              </span>
            </button>

            {onOpenGoLive && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenGoLive();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 transition group text-center"
              >
                <Radio className="w-5 h-5 text-red-500 mb-1 group-hover:scale-110 transition animate-pulse" />
                <span className="text-[10px] text-red-300 font-myanmar font-semibold">
                  တိုက်ရိုက် LIVE
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => nativePhotoInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 transition group text-center"
              title="ဖုန်းကင်မရာ အက်ပ်ဖြင့် ဓာတ်ပုံရိုက်မည်"
            >
              <Smartphone className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
              <span className="text-[10px] text-emerald-200 font-myanmar font-medium">
                ဖုန်းဓာတ်ပုံ
              </span>
            </button>

            <button
              type="button"
              onClick={() => nativeVideoInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 transition group text-center"
              title="ဖုန်းကင်မရာ အက်ပ်ဖြင့် ဗီဒီယိုရိုက်မည်"
            >
              <Smartphone className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition" />
              <span className="text-[10px] text-amber-200 font-myanmar font-medium">
                ဖုန်းဗီဒီယို
              </span>
            </button>
            <input
              ref={nativePhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={nativeVideoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0B0E14]/90 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-myanmar text-[11px]">{t('dataSavedPersistent')}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isUploading || (!caption.trim() && !mediaUrl)}
            className="px-6 py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-sm flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="font-myanmar">{t('navCreate')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
