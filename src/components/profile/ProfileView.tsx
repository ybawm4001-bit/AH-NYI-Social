import React, { useState } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Grid, 
  Video as VideoIcon, 
  Image as ImageIcon, 
  Heart, 
  Edit3, 
  LogOut, 
  MapPin, 
  Globe, 
  Share2, 
  Plus, 
  Check, 
  X,
  Camera,
  Coins,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { User, Post } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { PostCard } from '../feed/PostCard';

interface ProfileViewProps {
  user: User;
  currentUser: User;
  posts: Post[];
  onOpenSettings: () => void;
  onLogout: () => void;
  onPostDeleted: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenCreatorProfile: (userId: string) => void;
  onReportPost: (post: Post) => void;
  onUserUpdated: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  currentUser,
  posts,
  onOpenSettings,
  onLogout,
  onPostDeleted,
  onOpenComments,
  onOpenCreatorProfile,
  onReportPost,
  onUserUpdated,
}) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'photos' | 'liked'>('posts');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Edit form state
  const [editName, setEditName] = useState<string>(user.name);
  const [editBio, setEditBio] = useState<string>(user.bio || '');
  const [editLocation, setEditLocation] = useState<string>(user.location || '');
  const [editWebsite, setEditWebsite] = useState<string>(user.website || '');
  const [editAvatar, setEditAvatar] = useState<string>(user.avatar);
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    return storage.isFollowing(currentUser.id, user.id);
  });
  const [followersCount, setFollowersCount] = useState<number>(user.followersCount || 0);

  const handleToggleFollow = async () => {
    const result = await storage.toggleFollowUser(currentUser.id, user.id);
    setIsFollowing(result.isFollowing);
    setFollowersCount(result.targetFollowersCount);
    onUserUpdated();
  };

  const isMe = user.id === currentUser.id;

  // Filter posts
  const userPosts = posts.filter(p => p.authorId === user.id);
  const userVideos = userPosts.filter(p => p.type === 'video');
  const userPhotos = userPosts.filter(p => p.type === 'photo');
  const likedPosts = posts.filter(p => p.likes.includes(user.id));

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await storage.saveUser({
      ...user,
      name: editName.trim() || user.name,
      bio: editBio.trim(),
      location: editLocation.trim(),
      website: editWebsite.trim(),
      avatar: editAvatar,
    });
    setIsEditing(false);
    onUserUpdated();
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 pt-2 px-3 sm:px-4 space-y-5">
      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl overflow-hidden border border-[#D4AF37]/30 shadow-xl">
        {/* Cover Photo */}
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-[#141A26] via-[#1E2536] to-[#0F131C] overflow-hidden">
          {user.coverImage ? (
            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#D4AF37]/20 to-black/60" />
          )}

          {/* Quick Settings Action (if own profile) */}
          {isMe && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition"
                title={t('navSettings')}
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-full bg-red-950/60 backdrop-blur-md border border-red-500/30 text-red-300 hover:bg-red-900 transition"
                title={t('navLogout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar with gold border */}
          <div className="flex justify-between items-end -mt-14 mb-4">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#0F131C] shadow-2xl"
              />
              {user.role === 'owner' && (
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#121620] border-2 border-[#D4AF37] shadow-lg">
                  <Crown className="w-4 h-4 text-[#F6D365] fill-[#F6D365]" />
                </div>
              )}
            </div>

            {/* Profile CTA buttons */}
            <div className="flex gap-2">
              {isMe ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold font-myanmar flex items-center gap-1.5 transition border border-white/10"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('editProfile')}</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-2 rounded-full text-xs font-semibold font-myanmar shadow-lg active:scale-95 transition flex items-center gap-1.5 ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                      : 'gold-gradient-bg text-black hover:brightness-110'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-[#F6D365]" />
                      <span>{t('following')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('follow')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Name & Role */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-myanmar flex items-center gap-1.5">
                {user.name}
              </h2>
              {user.isVerified && (
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]/20" />
              )}
              {user.role === 'owner' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40 font-semibold">
                  Owner
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">@{user.handle}</p>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="mt-3 text-xs sm:text-sm text-gray-300 font-myanmar leading-relaxed">
              {user.bio}
            </p>
          )}

          {/* Meta Details */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F6D365]" />
                <span>{user.location}</span>
              </span>
            )}
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#D4AF37] hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{user.website.replace('https://', '')}</span>
              </a>
            )}
          </div>

          {/* Counter Bar */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="font-bold text-white font-mono text-sm block">
                {(user.postsCount || userPosts.length).toLocaleString()}
              </span>
              <span className="text-gray-400 font-myanmar">{t('posts')}</span>
            </div>
            <div>
              <span className="font-bold text-white font-mono text-sm block">
                {followersCount.toLocaleString()}
              </span>
              <span className="text-gray-400 font-myanmar">{t('followers')}</span>
            </div>
            <div>
              <span className="font-bold text-white font-mono text-sm block">
                {(user.followingCount || 0).toLocaleString()}
              </span>
              <span className="text-gray-400 font-myanmar">{t('following')}</span>
            </div>
            {isMe && user.balanceMmk !== undefined && (
              <div className="ml-auto pl-4 border-l border-white/10">
                <span className="font-bold text-[#F6D365] font-mono text-sm block flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {user.balanceMmk.toLocaleString()} MMK
                </span>
                <span className="text-gray-400 font-myanmar text-[10px]">Creator Balance</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-around border-b border-white/10 text-xs font-myanmar">
        <button
          onClick={() => setActiveTab('posts')}
          className={`py-3 px-4 font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'posts'
              ? 'border-[#D4AF37] text-[#F6D365]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>{t('tabPosts')} ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 px-4 font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'videos'
              ? 'border-[#D4AF37] text-[#F6D365]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <VideoIcon className="w-4 h-4" />
          <span>{t('tabVideos')} ({userVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`py-3 px-4 font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'photos'
              ? 'border-[#D4AF37] text-[#F6D365]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>{t('tabPhotos')} ({userPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('liked')}
          className={`py-3 px-4 font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'liked'
              ? 'border-[#D4AF37] text-[#F6D365]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>{t('tabLiked')} ({likedPosts.length})</span>
        </button>
      </div>

      {/* Tab Content Stream */}
      <div className="space-y-6">
        {activeTab === 'posts' && (
          userPosts.length === 0 ? (
            <div className="text-center p-12 text-gray-400 font-myanmar text-sm">Post များ မရှိသေးပါ။</div>
          ) : (
            userPosts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                currentUser={currentUser}
                onPostDeleted={onPostDeleted}
                onOpenComments={onOpenComments}
                onOpenCreatorProfile={onOpenCreatorProfile}
                onReportPost={onReportPost}
              />
            ))
          )
        )}

        {activeTab === 'videos' && (
          userVideos.length === 0 ? (
            <div className="text-center p-12 text-gray-400 font-myanmar text-sm">တင်ထားသော ဗီဒီယို မရှိသေးပါ။</div>
          ) : (
            userVideos.map(p => (
              <PostCard
                key={p.id}
                post={p}
                currentUser={currentUser}
                onPostDeleted={onPostDeleted}
                onOpenComments={onOpenComments}
                onOpenCreatorProfile={onOpenCreatorProfile}
                onReportPost={onReportPost}
              />
            ))
          )
        )}

        {activeTab === 'photos' && (
          userPhotos.length === 0 ? (
            <div className="text-center p-12 text-gray-400 font-myanmar text-sm">တင်ထားသော ဓာတ်ပုံ မရှိသေးပါ။</div>
          ) : (
            userPhotos.map(p => (
              <PostCard
                key={p.id}
                post={p}
                currentUser={currentUser}
                onPostDeleted={onPostDeleted}
                onOpenComments={onOpenComments}
                onOpenCreatorProfile={onOpenCreatorProfile}
                onReportPost={onReportPost}
              />
            ))
          )
        )}

        {activeTab === 'liked' && (
          likedPosts.length === 0 ? (
            <div className="text-center p-12 text-gray-400 font-myanmar text-sm">ကြိုက်နှစ်သက်ခဲ့သော Post များ မရှိသေးပါ။</div>
          ) : (
            likedPosts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                currentUser={currentUser}
                onPostDeleted={onPostDeleted}
                onOpenComments={onOpenComments}
                onOpenCreatorProfile={onOpenCreatorProfile}
                onReportPost={onReportPost}
              />
            ))
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveProfile} className="relative w-full max-w-md rounded-3xl bg-[#121620] border border-[#D4AF37]/30 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-semibold text-white font-myanmar">{t('editProfile')}</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer">
                <img src={editAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37]" />
                <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                </label>
              </div>
              <span className="text-[11px] text-gray-400 font-myanmar">ဓာတ်ပုံ ပြောင်းရန် နှိပ်ပါ</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-myanmar">{t('displayName')}</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-myanmar"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-myanmar">Bio (မိတ်ဆက်စာ)</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-myanmar"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-myanmar">{t('location')}</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Yangon, Myanmar"
                  className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-myanmar">{t('website')}</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-xs font-myanmar hover:bg-white/20 transition"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl gold-gradient-bg text-black text-xs font-semibold font-myanmar shadow-lg hover:brightness-110 transition"
              >
                {t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
