/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TranslationProvider, useTranslation } from './hooks/useTranslation';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { HomeFeed } from './components/feed/HomeFeed';
import { ProfileView } from './components/profile/ProfileView';
import { InboxView } from './components/chat/InboxView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { SearchView } from './components/search/SearchView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsView } from './components/settings/SettingsView';
import { TikTokCameraStudio, TikTokStudioMode } from './components/studio/TikTokCameraStudio';
import { CommentDrawer } from './components/feed/CommentDrawer';
import { ReportModal } from './components/common/ReportModal';
import { AuthModal } from './components/auth/AuthModal';
import { ApkBuildGuideModal } from './components/apk/ApkBuildGuideModal';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { storage } from './services/storage';
import { User, Post, SystemSettings } from './types';
import { Crown, Sparkles, Volume2, Globe, Check } from 'lucide-react';

function MainApp() {
  const { t, language, setLanguage } = useTranslation();

  // Core Data State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'inbox' | 'profile'>('home');
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  // TikTok-Style Camera & Video Studio
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [studioMode, setStudioMode] = useState<TikTokStudioMode>('create');

  const openStudio = (m: TikTokStudioMode = 'create') => {
    setStudioMode(m);
    setIsStudioOpen(true);
  };

  // Modals & Panels State
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);

  // Sub-features
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; item: Post | User } | null>(null);

  // First-run welcome language modal
  const [showLanguagePrompt, setShowLanguagePrompt] = useState<boolean>(() => {
    return !localStorage.getItem('ahnyi_language_confirmed');
  });

  // Load app data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allUsers = await storage.getUsers();
    setUsers(allUsers);

    const currentId = storage.getCurrentUserId();
    const user = allUsers.find(u => u.id === currentId) || allUsers[0];
    setCurrentUser(user);

    const allPosts = await storage.getPosts();
    setPosts(allPosts);

    const settings = await storage.getSystemSettings();
    setSystemSettings(settings);

    if (user) {
      const notifs = await storage.getNotifications(user.id);
      setUnreadNotifsCount(notifs.filter(n => !n.isRead).length);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleOpenCreatorProfile = (userId: string) => {
    setViewingProfileUserId(userId);
    setActiveTab('profile');
  };

  const handleLogout = () => {
    // Reset to user 1 or open auth
    storage.setCurrentUserId('');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    loadData();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Active profile user is either the one being viewed or the logged-in user
  const activeProfileUser = viewingProfileUserId 
    ? users.find(u => u.id === viewingProfileUserId) || currentUser
    : currentUser;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F3F4F6] flex flex-col antialiased selection:bg-[#D4AF37]/30">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        unreadNotifsCount={unreadNotifsCount}
        onOpenCreate={() => openStudio('create')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSearch={() => setActiveTab('search')}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenProfile={() => {
          setViewingProfileUserId(null);
          setActiveTab('profile');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenApkGuide={() => setIsApkGuideOpen(true)}
        onLogout={handleLogout}
      />

      {/* Prominent PWA Standalone Install Banner (Automatically hides in standalone mode) */}
      <PWAInstallBanner />

      {/* Optional Platform Announcement Banner */}
      {systemSettings && (systemSettings.announcementMy || systemSettings.announcementEn) && (
        <div className="w-full bg-gradient-to-r from-[#D4AF37]/20 via-[#1A202C] to-[#D4AF37]/20 border-b border-[#D4AF37]/30 py-2 px-4 text-center text-xs text-[#F6D365] font-myanmar flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {language === 'my' ? systemSettings.announcementMy : systemSettings.announcementEn}
          </span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto pt-2 pb-16">
        {activeTab === 'home' && (
          <HomeFeed
            posts={posts}
            currentUser={currentUser}
            creators={users}
            onRefresh={loadData}
            onPostDeleted={handlePostDeleted}
            onOpenComments={(post) => setCommentPost(post)}
            onOpenCreatorProfile={handleOpenCreatorProfile}
            onReportPost={(post) => setReportTarget({ type: 'post', item: post })}
            onOpenCreate={() => openStudio('create')}
            onOpenLiveCamera={() => openStudio('camera')}
            onOpenLiveVideo={() => openStudio('create')}
            onOpenGoLive={() => openStudio('live')}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            posts={posts}
            users={users}
            currentUser={currentUser}
            onOpenCreatorProfile={handleOpenCreatorProfile}
            onPostDeleted={handlePostDeleted}
            onOpenComments={(post) => setCommentPost(post)}
            onReportPost={(post) => setReportTarget({ type: 'post', item: post })}
          />
        )}

        {activeTab === 'inbox' && (
          <InboxView
            currentUser={currentUser}
            users={users}
            onReportUser={(user) => setReportTarget({ type: 'user', item: user })}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={activeProfileUser}
            currentUser={currentUser}
            posts={posts}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogout={handleLogout}
            onPostDeleted={handlePostDeleted}
            onOpenComments={(post) => setCommentPost(post)}
            onOpenCreatorProfile={handleOpenCreatorProfile}
            onReportPost={(post) => setReportTarget({ type: 'post', item: post })}
            onUserUpdated={loadData}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        currentUser={currentUser}
        onSelectTab={(tab) => {
          if (tab === 'profile') setViewingProfileUserId(null);
          setActiveTab(tab);
        }}
        onOpenCreate={() => openStudio('create')}
        unreadMessagesCount={1}
      />

      {/* --- MODALS & OVERLAYS --- */}

      {/* TikTok-Style Camera & Video Studio */}
      <TikTokCameraStudio
        isOpen={isStudioOpen}
        currentUser={currentUser}
        initialMode={studioMode}
        onClose={() => setIsStudioOpen(false)}
        onPostPublished={loadData}
      />

      {/* Comment Drawer Modal */}
      <CommentDrawer
        post={commentPost}
        currentUser={currentUser}
        isOpen={!!commentPost}
        onClose={() => setCommentPost(null)}
        onCommentAdded={loadData}
      />

      {/* Report Modal */}
      <ReportModal
        target={reportTarget}
        currentUser={currentUser}
        onClose={() => setReportTarget(null)}
      />

      {/* Notifications Overlay Modal */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"
            >
              ✕
            </button>
            <NotificationsView
              currentUser={currentUser}
              onOpenPost={(targetPostId) => {
                setIsNotificationsOpen(false);
                const found = posts.find(p => p.id === targetPostId);
                if (found) {
                  setActiveTab('home');
                  setTimeout(() => {
                    setCommentPost(found);
                  }, 200);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal */}
      {isAdminOpen && (
        <AdminDashboard
          currentUser={currentUser}
          onClose={() => setIsAdminOpen(false)}
          onDataModified={loadData}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"
            >
              ✕
            </button>
            <SettingsView
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenApkGuide={() => {
                setIsSettingsOpen(false);
                setIsApkGuideOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Android APK Guide Modal */}
      <ApkBuildGuideModal
        isOpen={isApkGuideOpen}
        onClose={() => setIsApkGuideOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* First-Run Language Selection Prompt (Section 2) */}
      {showLanguagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-myanmar">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border border-[#D4AF37]/50 shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl gold-gradient-bg text-black mx-auto flex items-center justify-center shadow-lg font-bold font-serif text-3xl">
              A
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">မင်္ဂလာပါ • Welcome to AH NYI</h3>
              <p className="text-xs text-gray-300">
                ကျေးဇူးပြု၍ မိမိ အသုံးပြုလိုသော ဘာသာစကားကို ရွေးချယ်ပေးပါ
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setLanguage('my');
                  localStorage.setItem('ahnyi_language_confirmed', 'true');
                  setShowLanguagePrompt(false);
                }}
                className="p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-[#D4AF37] text-white flex flex-col items-center gap-2 group transition"
              >
                <Globe className="w-6 h-6 text-[#F6D365] group-hover:scale-110 transition" />
                <span className="font-bold text-sm">မြန်မာဘာသာ</span>
                <span className="text-[10px] text-gray-400">Unicode Font</span>
              </button>

              <button
                onClick={() => {
                  setLanguage('en');
                  localStorage.setItem('ahnyi_language_confirmed', 'true');
                  setShowLanguagePrompt(false);
                }}
                className="p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-white/20 text-white flex flex-col items-center gap-2 group transition"
              >
                <Globe className="w-6 h-6 text-sky-400 group-hover:scale-110 transition" />
                <span className="font-bold text-sm">English</span>
                <span className="text-[10px] text-gray-400">Default International</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <TranslationProvider>
      <MainApp />
    </TranslationProvider>
  );
}
