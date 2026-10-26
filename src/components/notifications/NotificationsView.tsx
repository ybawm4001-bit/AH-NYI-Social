import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, ShieldAlert, CheckCheck, Trash2 } from 'lucide-react';
import { NotificationItem, User } from '../../types';
import { storage } from '../../services/storage';
import { useTranslation } from '../../hooks/useTranslation';

interface NotificationsViewProps {
  currentUser: User;
  onOpenPost?: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  onOpenPost,
  onOpenProfile,
}) => {
  const { t, language } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifs();
  }, [currentUser.id]);

  const loadNotifs = async () => {
    const list = await storage.getNotifications(currentUser.id);
    setNotifications(list);
  };

  const handleMarkAllRead = async () => {
    await storage.markAllNotificationsAsRead(currentUser.id);
    await loadNotifs();
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await storage.markNotificationAsRead(notif.id);
      await loadNotifs();
    }
    if (notif.targetId && onOpenPost) {
      onOpenPost(notif.targetId);
    }
  };

  const filtered = notifications.filter(n => (filter === 'unread' ? !n.isRead : true));

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 pt-2 px-3 sm:px-4 space-y-4">
      <div className="glass-card rounded-3xl p-5 border border-[#D4AF37]/30 shadow-xl space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#F6D365]" />
            <h2 className="font-bold text-white font-myanmar text-base">
              {t('notificationsTitle')}
            </h2>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-myanmar"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{t('markAllRead')}</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-myanmar transition ${
              filter === 'all'
                ? 'gold-gradient-bg text-black font-semibold'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {t('allNotifications')} ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full text-xs font-myanmar transition ${
              filter === 'unread'
                ? 'gold-gradient-bg text-black font-semibold'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {t('unreadOnly')} ({notifications.filter(n => !n.isRead).length})
          </button>
        </div>

        {/* List */}
        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-myanmar text-xs">
              {t('noNotifications')}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`py-3 px-2 flex items-start gap-3 rounded-2xl cursor-pointer transition hover:bg-white/5 ${
                  !item.isRead ? 'bg-[#D4AF37]/5' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={item.senderAvatar}
                    alt={item.senderName}
                    className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/30"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#121620] border border-[#D4AF37]">
                    {item.type === 'like' && <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />}
                    {item.type === 'comment' && <MessageCircle className="w-2.5 h-2.5 text-sky-400" />}
                    {item.type === 'follow' && <UserPlus className="w-2.5 h-2.5 text-[#F6D365]" />}
                    {item.type === 'system' && <ShieldAlert className="w-2.5 h-2.5 text-[#D4AF37]" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 font-myanmar leading-relaxed">
                    <span className="font-semibold text-white mr-1.5">{item.senderName}</span>
                    {language === 'my' ? item.messageMy : item.messageEn}
                  </p>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {!item.isRead && (
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
