import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Crown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  LogIn,
  Users
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { User } from '../../types';
import { OWNER_EMAIL } from '../../services/initialData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'switch' | 'forgot'>('login');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      storage.getUsers().then(setRegisteredUsers);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // AH NYI Founder / Owner Quick Authentication
  const handleQuickOwnerSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      setTimeout(async () => {
        let existing = await storage.getUserByEmail(OWNER_EMAIL);
        if (!existing) {
          const ownerUser: User = {
            id: 'user_owner_001',
            name: 'AH NYI Founder',
            handle: 'ahnyi_owner',
            email: OWNER_EMAIL,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            bio: 'AH NYI မူလပိုင်ရှင် (Platform Owner). မြန်မာ့လူမှုကွန်ရက်ကို ကမ္ဘာ့အဆင့်မီ တည်ဆောက်လျက်ရှိသည်။',
            role: 'owner',
            isVerified: true,
            followersCount: 12540,
            followingCount: 142,
            postsCount: 18,
            createdAt: new Date().toISOString(),
            status: 'active',
            balanceMmk: 1850000
          };
          await storage.saveUser(ownerUser);
          existing = ownerUser;
        }

        storage.setCurrentUserId(existing.id);
        setIsSubmitting(false);
        setSuccessMsg('AH NYI မူလပိုင်ရှင် (Owner) အဖြစ် အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ!');
        setTimeout(() => {
          onAuthSuccess(existing!);
          onClose();
        }, 500);
      }, 500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg('အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပါ။');
    }
  };

  const handleSelectExistingUser = (u: User) => {
    if (u.status === 'suspended') {
      setErrorMsg(t('bannedNotice'));
      return;
    }
    storage.setCurrentUserId(u.id);
    onAuthSuccess(u);
    onClose();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMsg(t('resetPasswordSent'));
        }, 800);
        return;
      }

      if (mode === 'login') {
        const users = await storage.getUsers();
        let found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        
        // If owner email is used, authenticate as owner
        if (email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()) {
          found = users.find(u => u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) || users[0];
        }

        if (found) {
          if (found.status === 'suspended') {
            setIsSubmitting(false);
            setErrorMsg(t('bannedNotice'));
            return;
          }
          storage.setCurrentUserId(found.id);
          setIsSubmitting(false);
          onAuthSuccess(found);
          onClose();
        } else {
          setIsSubmitting(false);
          setErrorMsg(t('authError'));
        }
      } else {
        // Register new user
        if (!name.trim() || !email.trim() || !password.trim()) {
          setIsSubmitting(false);
          setErrorMsg('ကျေးဇူးပြု၍ အချက်အလက်များ အပြည့်အစုံ ဖြည့်စွက်ပါ။');
          return;
        }

        const cleanHandle = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        const isOwnerEmail = email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();

        const newUser: User = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          handle: cleanHandle,
          email: email.trim().toLowerCase(),
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
          bio: 'AH NYI အဖွဲ့ဝင်အသစ် ဖြစ်ပါသည်။',
          role: isOwnerEmail ? 'owner' : 'user',
          isVerified: isOwnerEmail,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: new Date().toISOString(),
          status: 'active',
          balanceMmk: 0
        };

        await storage.saveUser(newUser);
        storage.setCurrentUserId(newUser.id);
        setIsSubmitting(false);
        onAuthSuccess(newUser);
        onClose();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Authentication error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-[#121620] border border-[#D4AF37]/40 shadow-2xl p-6 sm:p-7 space-y-4 font-myanmar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gold-gradient-bg text-black flex items-center justify-center font-bold font-serif text-sm">
              A
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {mode === 'login' ? t('loginTitle') : mode === 'register' ? t('createNewAccount') : mode === 'switch' ? t('switchAccount') : t('forgotPassword')}
              </h3>
              <p className="text-[11px] text-gray-400">AH NYI Social Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
              mode === 'login' ? 'gold-gradient-bg text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('loginButton')}</span>
          </button>

          <button
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
              mode === 'register' ? 'gold-gradient-bg text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('registerButton')}</span>
          </button>

          <button
            onClick={() => { setMode('switch'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
              mode === 'switch' ? 'gold-gradient-bg text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>အကောင့်များ</span>
          </button>
        </div>

        {/* MODE: SWITCH BETWEEN ACCOUNTS (Allows testing owner vs regular user easily) */}
        {mode === 'switch' ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              အောက်ပါ အကောင့်များထဲမှ အသုံးပြုလိုသည့် အကောင့်ကို ချက်ချင်း ရွေးချယ်နိုင်ပါသည် -
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {registeredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectExistingUser(u)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    u.role === 'owner'
                      ? 'bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-[#D4AF37]/50 hover:border-[#D4AF37]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      {u.role === 'owner' && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121620] border border-[#D4AF37]">
                          <Crown className="w-3 h-3 text-[#F6D365] fill-[#F6D365]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white">{u.name}</span>
                        {u.role === 'owner' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40 font-semibold">
                            Owner
                          </span>
                        )}
                        {u.status === 'suspended' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-semibold">
                            Banned
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{u.email}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#F6D365] font-semibold">ဝင်မည် →</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMode('register')}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#D4AF37]/50 text-[#F6D365] text-xs font-semibold hover:bg-[#D4AF37]/10 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('createNewAccount')}</span>
            </button>
          </div>
        ) : (
          <>
            {/* AH NYI Founder / Owner One-Tap Sign In Button (Zero Third-Party Logos) */}
            {mode !== 'forgot' && (
              <div className="space-y-3">
                <button
                  onClick={handleQuickOwnerSignIn}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl transition active:scale-95 disabled:opacity-50 hover:brightness-105 font-myanmar"
                >
                  <Crown className="w-4 h-4 fill-black stroke-black" />
                  <span>AH NYI မူလပိုင်ရှင် (Owner) အဖြစ် ချက်ချင်းဝင်မည်</span>
                </button>

                <div className="flex items-center gap-2 my-2">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-myanmar">သို့မဟုတ် Email ဖြင့်</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">{t('namePlaceholder')}</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ဦးမောင်မောင်"
                      className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-400">{t('emailPlaceholder')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">{t('passwordPlaceholder')}</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] text-[#D4AF37] hover:underline"
                      >
                        {t('forgotPassword')}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl gold-gradient-bg text-black font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'ဆောင်ရွက်နေပါသည်...' : mode === 'login' ? t('loginButton') : mode === 'register' ? t('registerButton') : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
