import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  MoreHorizontal, 
  ShieldCheck, 
  Trash2, 
  Flag, 
  Copy, 
  Check,
  Crown,
  Ban,
  FastForward,
  Sparkles,
  X,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { Post, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onPostDeleted: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenCreatorProfile: (userId: string) => void;
  onReportPost: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostDeleted,
  onOpenComments,
  onOpenCreatorProfile,
  onReportPost,
}) => {
  const { t, language } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLikedByMe = post.likes.includes(currentUser.id);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState<boolean>(isLikedByMe);
  const [likeAnimating, setLikeAnimating] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    return storage.isFollowing(currentUser.id, post.authorId);
  });

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await storage.toggleFollowUser(currentUser.id, post.authorId);
    setIsFollowing(result.isFollowing);
  };

  // Ad Skip System
  const [isAdSkipped, setIsAdSkipped] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);

  useEffect(() => {
    if (post.isSponsored && !isAdSkipped) {
      const interval = setInterval(() => {
        setAdCountdown((prev) => {
          if (prev <= 1) {
            setCanSkipAd(true);
            clearInterval(interval);
            return 0;
          }
          if (prev <= 3) {
            setCanSkipAd(true);
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [post.isSponsored, isAdSkipped]);

  const isOwner = currentUser.role === 'owner';
  const isAuthor = currentUser.id === post.authorId;
  const canDelete = isAuthor || isOwner || currentUser.role === 'admin';

  const handleToggleLike = async () => {
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 800);

    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    const result = await storage.toggleLikePost(post.id, currentUser.id);
    setIsLiked(result.liked);
    setLikesCount(result.likesCount);

    if (result.liked && post.authorId !== currentUser.id) {
      storage.addNotification({
        id: `notif_${Date.now()}`,
        recipientId: post.authorId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        type: 'like',
        messageMy: `သင်၏ Post ကို ${currentUser.name} မှ သဘောကျကြောင်း ဖော်ပြခဲ့သည်။`,
        messageEn: `${currentUser.name} liked your post.`,
        targetId: post.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    const confirmText = isOwner && !isAuthor
      ? 'Owner အခွင့်အာဏာဖြင့် ဤအသုံးပြုသူ၏ Post/Video ကို အပြီးတိုင် ဖျက်ရန် သေချာပါသလား?'
      : t('confirmDeletePost');

    if (window.confirm(confirmText)) {
      await storage.deletePost(post.id);
      onPostDeleted(post.id);
    }
    setShowMenu(false);
  };

  // Owner Ban User Flow
  const handleOwnerBanUser = async () => {
    if (!isOwner) return;
    if (post.authorId === currentUser.id) {
      alert('Owner account cannot be banned.');
      return;
    }
    if (window.confirm(`အသုံးပြုသူ "${post.authorName}" ၏ အကောင့်အား အပြီးတိုင် Ban (ပိတ်သိမ်း) ရန် သေချာပါသလား?`)) {
      const author = await storage.getUserById(post.authorId);
      if (author) {
        await storage.saveUser({ ...author, status: 'suspended' });
        alert(`အသုံးပြုသူ "${post.authorName}" ၏ အကောင့်အား Ban ပြီးပါပြီ။`);
      }
    }
    setShowMenu(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return language === 'my' ? 'ယခုလေးတင်' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${language === 'my' ? 'မိနစ်ခန့်က' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${language === 'my' ? 'နာရီခန့်က' : 'h ago'}`;
    return `${Math.floor(diff / 86400)} ${language === 'my' ? 'ရက်ခန့်က' : 'd ago'}`;
  };

  return (
    <article className="glass-card rounded-3xl overflow-hidden border border-[#D4AF37]/20 shadow-xl transition-all duration-300 hover:border-[#D4AF37]/35">
      {/* Post Author Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#0F131C]/60 gap-2">
        <div 
          onClick={() => onOpenCreatorProfile(post.authorId)}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1 min-w-0"
        >
          <div className="relative shrink-0">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/40 group-hover:scale-105 transition"
            />
            {post.authorRole === 'owner' && (
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121620] border border-[#D4AF37]">
                <Crown className="w-3 h-3 text-[#F6D365] fill-[#F6D365]" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-white group-hover:text-[#F6D365] transition font-myanmar truncate">
                {post.authorName}
              </span>
              {post.authorVerified && (
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]/20 shrink-0" />
              )}
              {post.authorRole === 'owner' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40 font-semibold shrink-0">
                  Owner
                </span>
              )}

              {/* Follow / Following button next to profile photo & name */}
              {currentUser.id !== post.authorId && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex items-center gap-1 shrink-0 ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                      : 'gold-gradient-bg text-black hover:brightness-110 shadow-sm'
                  }`}
                  title={isFollowing ? 'Following (Unfollow လုပ်မည်)' : 'Follow လုပ်မည်'}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3 h-3 text-[#F6D365]" />
                      <span>{language === 'my' ? 'Following' : 'Following'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      <span>{language === 'my' ? 'Follow' : 'Follow'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>@{post.authorHandle}</span>
              <span>•</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Post Actions: Quick Delete (Author or Owner) & More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Delete button for Author or Owner */}
          {canDelete && (
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-xl transition text-xs flex items-center gap-1 ${
                isAuthor
                  ? 'bg-white/5 hover:bg-red-950/60 text-gray-300 hover:text-red-300 border border-white/10'
                  : 'bg-red-950/50 hover:bg-red-900/70 text-red-400 hover:text-white border border-red-500/30'
              }`}
              title={isAuthor ? 'သင်၏ Post ကို ဖျက်မည်' : 'Owner: Delete content'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-myanmar hidden sm:inline">
                {isAuthor ? 'ဖျက်မည်' : 'Owner ဖျက်'}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-52 rounded-2xl bg-[#1A1F2C] border border-[#D4AF37]/30 shadow-2xl py-2 z-30 font-myanmar">
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2 text-left text-xs text-gray-200 hover:bg-white/10 flex items-center gap-2"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  <span>{copiedLink ? t('linkCopied') : t('copyLink')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onReportPost(post);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-amber-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>{t('reportPost')}</span>
                </button>

                {/* Owner Ban Option */}
                {isOwner && !isAuthor && (
                  <button
                    onClick={handleOwnerBanUser}
                    className="w-full px-4 py-2 text-left text-xs text-orange-400 hover:bg-white/10 flex items-center gap-2 border-t border-white/10 mt-1"
                  >
                    <Ban className="w-4 h-4" />
                    <span>အကောင့်ကို Ban မည် (Owner)</span>
                  </button>
                )}

                {/* Delete Post Option */}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-white/10 flex items-center gap-2 border-t border-white/10 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isOwner && !isAuthor ? 'Post အား ဖျက်မည် (Owner)' : t('deletePost')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Container (Video or Photo) */}
      {post.mediaUrl && (
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black/80 flex items-center justify-center overflow-hidden">
          {post.type === 'video' ? (
            <div 
              onClick={handleVideoClick} 
              className="relative w-full h-full cursor-pointer flex items-center justify-center bg-black"
            >
              <video
                ref={videoRef}
                src={post.mediaUrl}
                poster={post.mediaThumbnail}
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Play / Pause Overlay Icon */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-[#D4AF37]/50 shadow-xl">
                    <Play className="w-7 h-7 ml-1 fill-white" />
                  </div>
                </div>
              )}

              {/* Sound Toggle */}
              <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition z-10"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#F6D365]" />}
              </button>
            </div>
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post content"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              loading="lazy"
            />
          )}

          {/* Interactive Ad Banner & Skip Button for Sponsored Post */}
          {post.isSponsored && !isAdSkipped && (
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between p-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-[#D4AF37]/50 shadow-xl font-myanmar">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-bold text-[#F6D365]">
                  {t('adPlaying')} {post.sponsorName && `• ${post.sponsorName}`}
                </span>
                {!canSkipAd && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    ({adCountdown}s)
                  </span>
                )}
              </div>

              {/* Skip Ad Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAdSkipped(true);
                }}
                disabled={!canSkipAd}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  canSkipAd
                    ? 'gold-gradient-bg text-black shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-gray-400 cursor-not-allowed'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{canSkipAd ? t('skipAd') : `${adCountdown}s ${t('skipAdIn')}`}</span>
              </button>
            </div>
          )}

          {/* Floating Big Gold Heart animation on Like */}
          {likeAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Heart className="w-24 h-24 text-[#F6D365] fill-[#F6D365] animate-ping" />
            </div>
          )}
        </div>
      )}

      {/* Caption & Hashtags */}
      <div className="p-4 space-y-2.5">
        {post.caption && (
          <p className="text-sm text-gray-200 leading-relaxed font-myanmar whitespace-pre-wrap">
            {post.caption}
          </p>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-[#D4AF37] hover:underline cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Sponsor Banner if sponsored */}
        {post.isSponsored && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#F6D365] font-myanmar">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F6D365]" />
              <span className="font-semibold">{t('sponsored')}</span>
              {post.sponsorName && <span>• {post.sponsorName}</span>}
            </div>
            {!isAdSkipped && (
              <button
                onClick={() => setIsAdSkipped(true)}
                className="text-[11px] underline text-gray-300 hover:text-white"
              >
                {t('skipAd')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interaction Bar (Like, Comment, Share, Views) */}
      <div className="px-4 py-3 border-t border-white/10 bg-[#0F131C]/50 flex items-center justify-between text-xs text-gray-300">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 transition active:scale-90 ${
              isLiked ? 'text-[#F6D365]' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isLiked ? 'fill-[#F6D365] text-[#F6D365]' : ''
              }`}
            />
            <span className="font-semibold font-mono">{likesCount.toLocaleString()}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => onOpenComments(post)}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold font-mono">{(post.commentsCount || 0).toLocaleString()}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-gray-300 hover:text-[#F6D365] transition"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-semibold font-mono">{(post.sharesCount || 0).toLocaleString()}</span>
          </button>
        </div>

        {/* View Impressions */}
        <div className="flex items-center gap-1 text-gray-400">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="font-mono">{(post.viewsCount || 1).toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
};
