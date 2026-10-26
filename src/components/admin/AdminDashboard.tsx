import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  ShieldAlert, 
  Users, 
  FileText, 
  Flag, 
  Eye, 
  DollarSign, 
  Sliders, 
  Check, 
  X, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle, 
  Lock, 
  RefreshCw,
  Database,
  Cloud,
  Video as VideoIcon
} from 'lucide-react';
import { User, Post, ReportItem, SystemSettings, FirebaseManualConfig } from '../../types';
import { storage } from '../../services/storage';
import { useTranslation } from '../../hooks/useTranslation';

interface AdminDashboardProps {
  currentUser: User;
  onClose: () => void;
  onDataModified: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onClose,
  onDataModified,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'posts' | 'reports' | 'monetization' | 'settings'>('overview');

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseManualConfig>(storage.getFirebaseConfig());

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Security verification check: user must be owner or admin
  const isAuthorized = currentUser.role === 'owner' || currentUser.role === 'admin';

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    const allUsers = await storage.getUsers();
    const allPosts = await storage.getPosts();
    const allReports = await storage.getReports();
    const sysSettings = await storage.getSystemSettings();

    setUsers(allUsers);
    setPosts(allPosts);
    setReports(allReports);
    setSettings(sysSettings);
  };

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handlePromoteAdmin = async (targetUser: User) => {
    if (currentUser.role !== 'owner') {
      alert('Only the supreme Owner can appoint Admins.');
      return;
    }
    const updatedRole = targetUser.role === 'admin' ? 'creator' : 'admin';
    await storage.saveUser({ ...targetUser, role: updatedRole });
    showToast(`${targetUser.name} is now ${updatedRole}!`);
    await loadAdminData();
    onDataModified();
  };

  const handleToggleVerified = async (targetUser: User) => {
    await storage.saveUser({ ...targetUser, isVerified: !targetUser.isVerified });
    showToast(`Badge updated for ${targetUser.name}!`);
    await loadAdminData();
    onDataModified();
  };

  const handleToggleSuspend = async (targetUser: User) => {
    if (targetUser.role === 'owner') {
      alert('The Owner account cannot be suspended!');
      return;
    }
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    await storage.saveUser({ ...targetUser, status: nextStatus });
    showToast(`User status set to ${nextStatus}!`);
    await loadAdminData();
    onDataModified();
  };

  const handleDeleteViolatingPost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this violating post?')) {
      await storage.deletePost(postId);
      showToast('Violating post permanently removed.');
      await loadAdminData();
      onDataModified();
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    await storage.updateReport(reportId, action);
    showToast(`Report marked as ${action}.`);
    await loadAdminData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await storage.saveSystemSettings(settings);
    showToast('Platform settings successfully updated!');
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center border-red-500/40">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-gray-400 font-myanmar mb-6">
            ဤနေရာသို့ AH NYI ၏ မူလ Owner နှင့် ခွင့်ပြုချက်ရ Admin သာ ဝင်ရောက်နိုင်ပါသည်။
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalViews = posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#0F131C] border border-[#D4AF37]/40 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/20 bg-[#141A26]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gold-gradient-bg text-black shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white font-myanmar">
                  {t('adminTitle')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40 font-mono">
                  SUPREME OWNER
                </span>
              </div>
              <p className="text-xs text-gray-400 font-myanmar">
                {t('adminSubtitle')} • Owner: {currentUser.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toast Alert */}
        {notificationMsg && (
          <div className="bg-emerald-600/90 text-white text-xs py-2 px-6 text-center font-myanmar flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10 overflow-x-auto no-scrollbar bg-[#111622]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'overview'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>အနှစ်ချုပ် (Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'users'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('userManagement')} ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'posts'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('contentModeration')} ({posts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'reports'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{t('reportedItems')} ({reports.filter(r => r.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('monetization')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'monetization'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{t('monetizationCenter')}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold font-myanmar transition flex items-center gap-2 border-b-2 ${
              activeTab === 'settings'
                ? 'border-[#D4AF37] text-[#F6D365] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('platformSettings')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-[#D4AF37]/30">
                  <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-myanmar">
                    <span>{t('totalUsers')}</span>
                    <Users className="w-4 h-4 text-[#F6D365]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {users.length.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-400">+100% Owner Verified</span>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-[#D4AF37]/30">
                  <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-myanmar">
                    <span>{t('totalPosts')}</span>
                    <FileText className="w-4 h-4 text-[#F6D365]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {posts.length.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-gray-400">IndexedDB Persisted</span>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-[#D4AF37]/30">
                  <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-myanmar">
                    <span>{t('totalViewsCount')}</span>
                    <Eye className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {totalViews.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-sky-400">Authentic Impressions</span>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-[#D4AF37]/30">
                  <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-myanmar">
                    <span>{t('reportedItems')}</span>
                    <Flag className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {reports.length}
                  </div>
                  <span className="text-[10px] text-amber-400">Moderation Active</span>
                </div>
              </div>

              {/* Security Shield Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/40 flex items-start gap-4">
                <Crown className="w-8 h-8 text-[#F6D365] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm font-myanmar">
                    Owner အခွင့်အရေး စစ်မှန်မှု အာမခံချက်
                  </h4>
                  <p className="text-xs text-gray-300 font-myanmar leading-relaxed">
                    AH NYI ပလက်ဖောင်း၏ မူလပိုင်ရှင် (Owner) သည် {currentUser.email} ဖြစ်ပြီး၊ သာမန် User များသည် မိမိတို့ကိုယ်ကို Owner သို့မဟုတ် Admin အဖြစ် မပြောင်းလဲနိုင်စေရန် Role Authorization စနစ်ဖြင့် အပြည့်အဝ ကာကွယ်ထားပါသည်။
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#161C27] text-gray-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Followers</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-3 flex items-center gap-2">
                          <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                          <div>
                            <span className="font-semibold text-white font-myanmar">{u.name}</span>
                            <span className="text-gray-400 block text-[10px]">@{u.handle}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400">{u.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.role === 'owner' 
                              ? 'bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40' 
                              : u.role === 'admin' 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{(u.followersCount || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            u.status === 'suspended' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {currentUser.role === 'owner' && u.role !== 'owner' && (
                            <button
                              onClick={() => handlePromoteAdmin(u)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white transition text-[11px] font-myanmar"
                            >
                              {u.role === 'admin' ? t('demoteAdmin') : t('promoteToAdmin')}
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleVerified(u)}
                            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-myanmar ${
                              u.isVerified ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {u.isVerified ? t('removeBadge') : t('verifyUser')}
                          </button>

                          {u.role !== 'owner' && (
                            <button
                              onClick={() => handleToggleSuspend(u)}
                              className={`px-2.5 py-1 rounded-lg transition text-[11px] font-myanmar ${
                                u.status === 'suspended' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {u.status === 'suspended' ? t('activateUser') : t('suspendUser')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT MODERATION */}
          {activeTab === 'posts' && (
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-[#161C27] border border-white/5 flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    {p.mediaUrl ? (
                      p.type === 'video' ? (
                        <div className="w-16 h-16 rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/10">
                          <VideoIcon className="w-6 h-6 text-[#F6D365]" />
                        </div>
                      ) : (
                        <img src={p.mediaUrl} alt="Thumbnail" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      )
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-gray-400 text-xs">
                        Text
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white font-myanmar text-xs">{p.authorName}</span>
                        <span className="text-[10px] text-gray-400">@{p.authorHandle}</span>
                        <span className="text-[10px] text-gray-500">• {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-300 font-myanmar line-clamp-2">{p.caption}</p>
                      <div className="flex gap-3 text-[10px] text-gray-400 font-mono">
                        <span>Likes: {p.likesCount}</span>
                        <span>Comments: {p.commentsCount}</span>
                        <span>Views: {p.viewsCount}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteViolatingPost(p.id)}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-800 text-red-400 hover:text-white transition shrink-0"
                    title={t('deleteReportedContent')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center p-8 text-gray-400 font-myanmar text-sm">
                  တိုင်ကြားထားသော (Reported) Content မရှိပါ။ ပလက်ဖောင်း လုံခြုံမှု ကောင်းမွန်ပါသည်။
                </div>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-2xl bg-[#161C27] border border-amber-500/20 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Flag className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-xs text-amber-300 font-myanmar">Reason: {rep.reason}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300">{rep.status}</span>
                      </div>
                      <p className="text-xs text-gray-300 font-myanmar">Reported by: {rep.reporterName}</p>
                      {rep.targetPreview && (
                        <p className="text-xs text-gray-400 italic mt-1 font-myanmar">"{rep.targetPreview}"</p>
                      )}
                    </div>
                    {rep.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/80 text-white text-xs font-myanmar"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                          className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 text-xs font-myanmar"
                        >
                          {t('dismissReport')}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: MONETIZATION & CREATOR REWARDS */}
          {activeTab === 'monetization' && settings && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl glass-card border border-[#D4AF37]/30 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#F6D365]" />
                  <h3 className="font-bold text-white font-myanmar">{t('monetizationTitle')}</h3>
                </div>
                <p className="text-xs text-gray-300 font-myanmar leading-relaxed">
                  {t('monetizationDesc')}
                </p>
                <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#F6D365] font-myanmar">
                  {t('antiFraudNotice')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#161C27] border border-white/10 space-y-2">
                  <label className="text-xs text-gray-400 font-myanmar">CPM Rate (ကျပ်ငွေ / 1000 Views)</label>
                  <input
                    type="number"
                    value={settings.cpmRateMmk}
                    onChange={(e) => setSettings({ ...settings, cpmRateMmk: Number(e.target.value) })}
                    className="w-full bg-[#0F131C] border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm focus:border-[#D4AF37]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#161C27] border border-white/10 space-y-2">
                  <label className="text-xs text-gray-400 font-myanmar">Minimum Payout Threshold (ကျပ်ငွေ)</label>
                  <input
                    type="number"
                    value={settings.minPayoutMmk}
                    onChange={(e) => setSettings({ ...settings, minPayoutMmk: Number(e.target.value) })}
                    className="w-full bg-[#0F131C] border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="px-6 py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs font-myanmar shadow-lg hover:brightness-110 transition"
              >
                {t('saveChanges')}
              </button>
            </div>
          )}

          {/* TAB 6: SETTINGS & FIREBASE STATUS */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#161C27] border border-white/10 space-y-3">
                  <h4 className="font-semibold text-white text-xs font-myanmar">ကြေညာချက် စာသား (Announcement)</h4>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">မြန်မာဘာသာ</label>
                    <textarea
                      rows={2}
                      value={settings.announcementMy}
                      onChange={(e) => setSettings({ ...settings, announcementMy: e.target.value })}
                      className="w-full bg-[#0F131C] border border-white/10 rounded-xl p-3 text-xs text-white font-myanmar"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">English</label>
                    <textarea
                      rows={2}
                      value={settings.announcementEn}
                      onChange={(e) => setSettings({ ...settings, announcementEn: e.target.value })}
                      className="w-full bg-[#0F131C] border border-white/10 rounded-xl p-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#161C27] border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.adsEnabled}
                      onChange={(e) => setSettings({ ...settings, adsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#D4AF37]"
                    />
                    <span className="text-xs text-gray-200 font-myanmar">ကြော်ငြာစနစ် ဖွင့်လှစ်မည် (Enable Ads)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.creatorRewardsEnabled}
                      onChange={(e) => setSettings({ ...settings, creatorRewardsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#D4AF37]"
                    />
                    <span className="text-xs text-gray-200 font-myanmar">Creator Rewards ဖွင့်လှစ်မည်</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs font-myanmar shadow-lg hover:brightness-110 transition"
                >
                  {t('saveChanges')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
