import React from 'react';
import { Home, Search, Plus, MessageCircle, User as UserIcon, Crown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { User } from '../../types';

interface BottomNavProps {
  activeTab: 'home' | 'search' | 'inbox' | 'profile';
  currentUser: User;
  onSelectTab: (tab: 'home' | 'search' | 'inbox' | 'profile') => void;
  onOpenCreate: () => void;
  unreadMessagesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  currentUser,
  onSelectTab,
  onOpenCreate,
  unreadMessagesCount = 0,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-[#D4AF37]/25 pb-safe sm:hidden px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition ${
            activeTab === 'home' ? 'text-[#F6D365]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-myanmar">{t('navHome')}</span>
        </button>

        {/* 2. Magnifying Glass Search Tab */}
        <button
          onClick={() => onSelectTab('search')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition ${
            activeTab === 'search' ? 'text-[#F6D365]' : 'text-gray-400 hover:text-white'
          }`}
          title="ရှာဖွေမည်"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-myanmar">ရှာဖွေမည်</span>
        </button>

        {/* 3. Center Floating Gold Plus (+) Button */}
        <button
          onClick={onOpenCreate}
          className="relative -top-3 p-1 rounded-full gold-glow transition transform active:scale-95"
          title={t('navCreate')}
        >
          <div className="w-13 h-13 rounded-full gold-gradient-bg text-black flex items-center justify-center shadow-2xl border-2 border-[#121620]">
            <Plus className="w-7 h-7 stroke-[2.8]" />
          </div>
        </button>

        {/* 4. Inbox / Messages */}
        <button
          onClick={() => onSelectTab('inbox')}
          className={`relative flex flex-col items-center gap-0.5 py-1 px-3 transition ${
            activeTab === 'inbox' ? 'text-[#F6D365]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span className="text-[10px] font-myanmar">{t('navInbox')}</span>
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`relative flex flex-col items-center gap-0.5 py-1 px-3 transition ${
            activeTab === 'profile' ? 'text-[#F6D365]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className={`w-5 h-5 rounded-full object-cover border ${
                activeTab === 'profile' ? 'border-[#D4AF37]' : 'border-gray-500'
              }`}
            />
            {currentUser.role === 'owner' && (
              <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-[#121620]">
                <Crown className="w-2 h-2 text-[#F6D365] fill-[#F6D365]" />
              </span>
            )}
          </div>
          <span className="text-[10px] font-myanmar">{t('navProfile')}</span>
        </button>
      </div>
    </div>
  );
};
