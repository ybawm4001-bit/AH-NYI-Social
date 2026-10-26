import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Flame, 
  Users, 
  ShieldCheck, 
  Hash, 
  Crown, 
  Clock, 
  X, 
  Trash2,
  Video as VideoIcon, 
  Layers,
  UserPlus,
  UserCheck 
} from 'lucide-react';
import { Post, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { PostCard } from '../feed/PostCard';

interface SearchViewProps {
  posts: Post[];
  users: User[];
  currentUser: User;
  onOpenCreatorProfile: (userId: string) => void;
  onPostDeleted: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onReportPost: (post: Post) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  posts,
  users,
  currentUser,
  onOpenCreatorProfile,
  onPostDeleted,
  onOpenComments,
  onReportPost,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'videos' | 'accounts' | 'hashtags'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>(() => {
    const list = storage.getFollowingList(currentUser.id);
    const map: Record<string, boolean> = {};
    list.forEach(id => { map[id] = true; });
    return map;
  });

  const handleToggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    const result = await storage.toggleFollowUser(currentUser.id, targetUserId);
    setFollowingMap(prev => ({
      ...prev,
      [targetUserId]: result.isFollowing
    }));
  };

  useEffect(() => {
    setRecentSearches(storage.getRecentSearches());
  }, []);

  const popularHashtags = [
    { tag: '#AhNyi', count: '14.2K' },
    { tag: '#MyanmarCreators', count: '9.8K' },
    { tag: '#BaganSunrise', count: '8.4K' },
    { tag: '#YangonVibes', count: '6.7K' },
    { tag: '#MyanmarMusic', count: '5.1K' },
    { tag: '#TechMyanmar', count: '3.9K' },
  ];

  const handleSelectQuery = (query: string) => {
    setSearchTerm(query);
    const updated = storage.addRecentSearch(query);
    setRecentSearches(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const updated = storage.addRecentSearch(searchTerm.trim());
      setRecentSearches(updated);
    }
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = storage.removeRecentSearch(item);
    setRecentSearches(updated);
  };

  const handleClearAllHistory = () => {
    storage.clearRecentSearches();
    setRecentSearches([]);
  };

  // Filtered accounts
  const matchedUsers = users.filter(u => 
    searchTerm.trim() !== '' && (
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.bio && u.bio.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  // Filtered posts
  const matchedPosts = posts.filter(p => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    const matchCaption = p.caption?.toLowerCase().includes(term);
    const matchTag = p.hashtags?.some(h => h.toLowerCase().includes(term));
    const matchAuthor = p.authorName?.toLowerCase().includes(term) || p.authorHandle?.toLowerCase().includes(term);
    return matchCaption || matchTag || matchAuthor;
  });

  // Apply tab filters
  const displayedPosts = matchedPosts.filter(p => {
    if (filterType === 'videos') return p.type === 'video';
    if (filterType === 'hashtags') return p.hashtags?.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
    return true;
  });

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 pt-2 px-3 sm:px-4 space-y-5 font-myanmar">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-[#141A26] border border-[#D4AF37]/35 rounded-2xl pl-12 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] shadow-xl"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-3.5 p-1 rounded-full text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Type Pills (All, Videos, Accounts, Hashtags) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'all'
              ? 'gold-gradient-bg text-black shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('filterAll')}</span>
        </button>

        <button
          onClick={() => setFilterType('videos')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'videos'
              ? 'gold-gradient-bg text-black shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <VideoIcon className="w-3.5 h-3.5 text-red-400" />
          <span>{t('filterVideos')}</span>
        </button>

        <button
          onClick={() => setFilterType('accounts')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'accounts'
              ? 'gold-gradient-bg text-black shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>{t('filterAccounts')}</span>
        </button>

        <button
          onClick={() => setFilterType('hashtags')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'hashtags'
              ? 'gold-gradient-bg text-black shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-[#F6D365]" />
          <span>{t('filterHashtags')}</span>
        </button>
      </div>

      {/* When NO Search query: Show Recent Search History & Trending */}
      {!searchTerm.trim() ? (
        <div className="space-y-5">
          {/* Recent Searches (အရင်က ဘာရှာထားလဲ ပြန်ပေါ်သည့်စနစ်) */}
          {recentSearches.length > 0 && (
            <div className="glass-card rounded-3xl p-4 sm:p-5 border border-[#D4AF37]/25 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                    {t('recentSearches')}
                  </h3>
                </div>
                <button
                  onClick={handleClearAllHistory}
                  className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t('clearHistory')}</span>
                </button>
              </div>

              {/* Recent query chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSelectQuery(item)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs cursor-pointer transition group"
                  >
                    <Clock className="w-3 h-3 text-gray-400 group-hover:text-[#F6D365]" />
                    <span className="font-medium">{item}</span>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item)}
                      className="p-0.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          <div className="glass-card rounded-3xl p-5 border border-[#D4AF37]/25 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-white text-sm">
                {t('popularTags')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {popularHashtags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleSelectQuery(tag)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition flex items-center justify-between group"
                >
                  <span className="font-semibold text-xs text-[#F6D365] font-mono group-hover:underline">
                    {tag}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Featured Creators */}
          <div className="glass-card rounded-3xl p-5 border border-[#D4AF37]/25 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#F6D365]" />
              <h3 className="font-bold text-white text-sm">
                {t('creatorsTitle')}
              </h3>
            </div>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => onOpenCreatorProfile(u.id)}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/30" />
                      {u.role === 'owner' && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121620] border border-[#D4AF37]">
                          <Crown className="w-2.5 h-2.5 text-[#F6D365] fill-[#F6D365]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white">{u.name}</span>
                        {u.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        {u.role === 'owner' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/30">
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">@{u.handle} • {(u.followersCount || 0).toLocaleString()} followers</span>
                    </div>
                  </div>
                  {currentUser.id !== u.id && (
                    <button
                      onClick={(e) => handleToggleFollow(e, u.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 shadow-sm ${
                        followingMap[u.id]
                          ? 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                          : 'gold-gradient-bg text-black hover:brightness-110'
                      }`}
                    >
                      {followingMap[u.id] ? (
                        <>
                          <UserCheck className="w-3 h-3 text-[#F6D365]" />
                          <span>{t('following')}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>{t('follow')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Search Results Screen */
        <div className="space-y-5">
          {/* Matched Accounts (if filter is 'all' or 'accounts') */}
          {(filterType === 'all' || filterType === 'accounts') && matchedUsers.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-[#D4AF37]/25 space-y-3">
              <h4 className="font-bold text-xs text-gray-400 uppercase">
                {t('filterAccounts')} ({matchedUsers.length})
              </h4>
              <div className="space-y-2">
                {matchedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onOpenCreatorProfile(u.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/30" />
                      <div>
                        <span className="font-semibold text-xs text-white flex items-center gap-1">
                          {u.name}
                          {u.isVerified && <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />}
                        </span>
                        <span className="text-[10px] text-gray-400">@{u.handle}</span>
                      </div>
                    </div>
                    {currentUser.id !== u.id && (
                      <button
                        onClick={(e) => handleToggleFollow(e, u.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 shadow-sm ${
                          followingMap[u.id]
                            ? 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                            : 'gold-gradient-bg text-black hover:brightness-110'
                        }`}
                      >
                        {followingMap[u.id] ? (
                          <>
                            <UserCheck className="w-3 h-3 text-[#F6D365]" />
                            <span>{t('following')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>{t('follow')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Posts / Videos */}
          {filterType !== 'accounts' && displayedPosts.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-gray-400 uppercase">
                {filterType === 'videos' ? t('filterVideos') : 'Post များ'} ({displayedPosts.length})
              </h4>
              {displayedPosts.map((post) => (
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
          ) : (filterType !== 'accounts' && displayedPosts.length === 0 && matchedUsers.length === 0) ? (
            <div className="glass-card rounded-3xl p-12 text-center text-gray-400 text-sm">
              {t('noSearchResults')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
