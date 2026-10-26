import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  Crown, 
  Settings as SettingsIcon, 
  LogOut, 
  ShieldAlert, 
  Languages, 
  User as UserIcon,
  Video,
  Camera,
  Smartphone
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useTranslation } from '../../hooks/useTranslation';
import { User } from '../../types';

interface NavbarProps {
  currentUser: User;
  unreadNotifsCount: number;
  onOpenCreate: () => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenApkGuide: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  unreadNotifsCount,
  onOpenCreate,
  onOpenNotifications,
  onOpenSearch,
  onOpenAdmin,
  onOpenProfile,
  onOpenSettings,
  onOpenAuth,
  onOpenApkGuide,
  onLogout,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const isOwnerOrAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-[#D4AF37]/20 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={onOpenProfile}
          className="cursor-pointer"
        >
          <Logo size="md" showText={true} />
        </div>

        {/* Center: Search Trigger (Desktop) */}
        <div 
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#141A26] border border-white/10 hover:border-[#D4AF37]/40 text-gray-400 hover:text-white cursor-pointer transition w-64 md:w-80 shadow-inner"
        >
          <Search className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-xs font-myanmar truncate">{t('searchPlaceholder')}</span>
        </div>

        {/* Mobile Search Button (Always visible on mobile phones) */}
        <button
          onClick={onOpenSearch}
          className="flex sm:hidden p-2 rounded-full bg-[#141A26] border border-[#D4AF37]/35 text-[#F6D365] hover:scale-105 active:scale-95 transition"
          title="ရှာဖွေမည် (Search)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher pill */}
          <button
            onClick={() => setLanguage(language === 'my' ? 'en' : 'my')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F6D365] transition"
            title="Toggle Language (မြန်မာ / English)"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="uppercase text-[11px]">{language === 'my' ? 'မြန်မာ' : 'ENG'}</span>
          </button>

          {/* Android APK install helper button */}
          <button
            onClick={onOpenApkGuide}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161C27] hover:bg-[#1E2536] border border-[#D4AF37]/40 text-[#F6D365] text-xs font-semibold transition"
            title="Android APK"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="font-myanmar text-[11px]">APK Install</span>
          </button>

          {/* Owner Center Button (if owner/admin) */}
          {isOwnerOrAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#AA771C]/20 border border-[#D4AF37]/50 text-[#F6D365] hover:scale-105 active:scale-95 transition shadow-md"
              title={t('navAdmin')}
            >
              <Crown className="w-4 h-4 fill-[#F6D365]" />
              <span className="text-xs font-bold font-myanmar hidden lg:inline">
                {currentUser.role === 'owner' ? 'Owner ဗဟို' : 'Admin'}
              </span>
            </button>
          )}

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition"
            title={t('navNotifications')}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Quick Create Button (Desktop) */}
          <button
            onClick={onOpenCreate}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-2xl gold-gradient-bg text-black font-semibold text-xs shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="font-myanmar">{t('navCreate')}</span>
          </button>

          {/* User Profile Avatar / Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="relative p-0.5 rounded-full border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] transition"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              {currentUser.role === 'owner' && (
                <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-[#121620] border border-[#D4AF37]">
                  <Crown className="w-2.5 h-2.5 text-[#F6D365] fill-[#F6D365]" />
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl bg-[#141A26] border border-[#D4AF37]/30 shadow-2xl py-2 z-50 font-myanmar">
                <div className="px-4 py-2.5 border-b border-white/10">
                  <p className="font-semibold text-xs text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
                  {currentUser.role === 'owner' && (
                    <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/40 font-mono">
                      SUPREME OWNER
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setShowUserDropdown(false); onOpenProfile(); }}
                  className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/10 flex items-center gap-2.5"
                >
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span>{t('navProfile')}</span>
                </button>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => { setShowUserDropdown(false); onOpenAdmin(); }}
                    className="w-full px-4 py-2 text-left text-xs text-[#F6D365] hover:bg-white/10 flex items-center gap-2.5"
                  >
                    <Crown className="w-4 h-4 fill-[#F6D365]" />
                    <span>{t('navAdmin')}</span>
                  </button>
                )}

                <button
                  onClick={() => { setShowUserDropdown(false); onOpenSettings(); }}
                  className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/10 flex items-center gap-2.5"
                >
                  <SettingsIcon className="w-4 h-4 text-gray-400" />
                  <span>{t('navSettings')}</span>
                </button>

                <button
                  onClick={() => { setShowUserDropdown(false); onOpenAuth(); }}
                  className="w-full px-4 py-2 text-left text-xs text-sky-400 hover:bg-white/10 flex items-center gap-2.5"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>အကောင့် ပြောင်းဝင်မည်</span>
                </button>

                <button
                  onClick={() => { setShowUserDropdown(false); onLogout(); }}
                  className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-white/10 flex items-center gap-2.5 border-t border-white/10 mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('navLogout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
