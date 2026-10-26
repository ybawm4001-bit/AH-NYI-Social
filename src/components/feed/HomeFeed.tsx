import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Users, 
  Video as VideoIcon, 
  RefreshCw, 
  PlusCircle, 
  Crown,
  Camera,
  Radio
} from 'lucide-react';
import { Post, User } from '../../types';
import { PostCard } from './PostCard';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';

interface HomeFeedProps {
  posts: Post[];
  currentUser: User;
  creators: User[];
  onRefresh: () => void;
  onPostDeleted: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenCreatorProfile: (userId: string) => void;
  onReportPost: (post: Post) => void;
  onOpenCreate: () => void;
  onOpenLiveCamera?: () => void;
  onOpenLiveVideo?: () => void;
  onOpenGoLive?: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  posts,
  currentUser,
  creators,
  onRefresh,
  onPostDeleted,
  onOpenComments,
  onOpenCreatorProfile,
  onReportPost,
  onOpenCreate,
  onOpenLiveCamera,
  onOpenLiveVideo,
  onOpenGoLive,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following' | 'trending' | 'watch'>('forYou');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter posts based on tab
  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'watch') return post.type === 'video';
    if (activeTab === 'trending') return (post.likesCount || 0) > 300 || (post.viewsCount || 0) > 2000;
    if (activeTab === 'following') {
      // Show posts from creators other than self
      return post.authorId !== currentUser.id;
    }
    return true; // forYou: all
  });

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 pt-2 px-3 sm:px-4 space-y-5">
      {/* Stories / Active Creators Rail */}
      <div className="glass-card rounded-3xl p-3.5 border border-[#D4AF37]/25 shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* User's own add story tile */}
          <div 
            onClick={onOpenCreate}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative w-15 h-15 rounded-full p-0.5 border-2 border-dashed border-[#D4AF37]/60 group-hover:border-[#D4AF37] transition flex items-center justify-center">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full gold-gradient-bg text-black shadow-md">
                <PlusCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[10px] text-gray-300 font-myanmar text-center truncate max-w-[64px]">
              {t('navCreate')}
            </span>
          </div>

          {/* Creators stories list */}
          {creators.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenCreatorProfile(c.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative w-15 h-15 rounded-full p-0.5 gold-gradient-bg transition-transform group-hover:scale-105 shadow-md">
                <div className="w-full h-full rounded-full bg-[#0B0E14] p-0.5">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                {c.role === 'owner' && (
                  <span className="absolute -top-1 -right-1 p-1 rounded-full bg-[#121620] border border-[#D4AF37]">
                    <Crown className="w-3 h-3 text-[#F6D365] fill-[#F6D365]" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-300 font-myanmar text-center truncate max-w-[64px] group-hover:text-[#F6D365]">
                {c.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Camera & Video Creator Bar */}
      <div className="bg-[#121620] border border-[#D4AF37]/30 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2">
        <div 
          onClick={onOpenCreate}
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition text-gray-400 hover:text-white"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]/40"
          />
          <span className="text-xs font-myanmar truncate">စိတ်ထဲရှိတာတွေကို မျှဝေပါ...</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenLiveCamera && (
            <button
              onClick={onOpenLiveCamera}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 transition active:scale-95"
              title="ဓာတ်ပုံရိုက်မည်"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="font-myanmar hidden sm:inline text-[11px] font-medium">ကင်မရာ</span>
            </button>
          )}

          {onOpenLiveVideo && (
            <button
              onClick={onOpenLiveVideo}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5 transition active:scale-95"
              title="ဗီဒီယိုရိုက်မည်"
            >
              <VideoIcon className="w-4 h-4 text-red-400" />
              <span className="font-myanmar hidden sm:inline text-[11px] font-medium">ဗီဒီယို</span>
            </button>
          )}

          {onOpenGoLive && (
            <button
              onClick={onOpenGoLive}
              className="px-2.5 py-1.5 rounded-xl gold-gradient-bg text-black text-xs flex items-center gap-1.5 font-bold transition active:scale-95 shadow-md"
              title="တိုက်ရိုက် LIVE လွှင့်မည်"
            >
              <Radio className="w-4 h-4 text-red-600 animate-pulse" />
              <span className="font-myanmar text-[11px]">LIVE</span>
            </button>
          )}
        </div>
      </div>

      {/* Feed Tabs & Refresh Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-myanmar transition flex items-center gap-1.5 ${
              activeTab === 'forYou'
                ? 'gold-gradient-bg text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('tabForYou')}</span>
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-myanmar transition flex items-center gap-1.5 ${
              activeTab === 'following'
                ? 'gold-gradient-bg text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('tabFollowing')}</span>
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-myanmar transition flex items-center gap-1.5 ${
              activeTab === 'trending'
                ? 'gold-gradient-bg text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('tabTrending')}</span>
          </button>

          <button
            onClick={() => setActiveTab('watch')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-myanmar transition flex items-center gap-1.5 ${
              activeTab === 'watch'
                ? 'gold-gradient-bg text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5 text-red-400" />
            <span>{t('tabWatch')}</span>
          </button>
        </div>

        {/* Pull / Trigger Refresh */}
        <button
          onClick={handlePullToRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition active:scale-95 disabled:opacity-50"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 text-[#F6D365] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Posts Stream */}
      {filteredPosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center space-y-3 font-myanmar">
          <p className="text-gray-400 text-sm">ဤကဏ္ဍတွင် Post များ မရှိသေးပါ။</p>
          <button
            onClick={onOpenCreate}
            className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs inline-flex items-center gap-1.5 shadow-lg"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('createTitle')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onPostDeleted={onPostDeleted}
              onOpenComments={onOpenComments}
              onOpenCreatorProfile={onOpenCreatorProfile}
              onReportPost={onReportPost}
            />
          ))}
        </div>
      )}
    </div>
  );
};
