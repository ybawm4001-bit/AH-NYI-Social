import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Search, 
  ShieldCheck, 
  Crown, 
  MoreVertical, 
  Ban, 
  Flag, 
  ChevronLeft,
  Check,
  CheckCheck
} from 'lucide-react';
import { User, ChatMessage } from '../../types';
import { storage } from '../../services/storage';
import { useTranslation } from '../../hooks/useTranslation';

interface InboxViewProps {
  currentUser: User;
  users: User[];
  onReportUser: (user: User) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  currentUser,
  users,
  onReportUser,
}) => {
  const { t, language } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('ahnyi_blocked_users');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const availableContacts = users.filter(u => u.id !== currentUser.id);

  // Generate deterministic conversation ID
  const getConversationId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  useEffect(() => {
    if (selectedUser) {
      loadConversation(selectedUser.id);
    }
  }, [selectedUser]);

  const loadConversation = async (otherUserId: string) => {
    const convoId = getConversationId(currentUser.id, otherUserId);
    const msgs = await storage.getMessages(convoId);
    setMessages(msgs);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !inputMessage.trim()) return;

    if (blockedUserIds.includes(selectedUser.id)) {
      alert(t('userBlocked'));
      return;
    }

    const convoId = getConversationId(currentUser.id, selectedUser.id);
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: convoId,
      senderId: currentUser.id,
      recipientId: selectedUser.id,
      text: inputMessage.trim(),
      createdAt: new Date().toISOString(),
      isRead: false
    };

    await storage.sendMessage(newMsg);
    setMessages([...messages, newMsg]);
    setInputMessage('');

    // If chat with another user, simulate realistic reply for test/demonstration if first interaction
    if (messages.length === 0) {
      setTimeout(async () => {
        const replyMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          conversationId: convoId,
          senderId: selectedUser.id,
          recipientId: currentUser.id,
          text: language === 'my' 
            ? 'မင်္ဂလာပါ! AH NYI တွင် ဆက်သွယ်ပေးတဲ့အတွက် ဝမ်းသာပါတယ်ခင်ဗျာ။ ✨' 
            : 'Hello! Thank you for reaching out on AH NYI! ✨',
          createdAt: new Date().toISOString(),
          isRead: true
        };
        await storage.sendMessage(replyMsg);
        setMessages(prev => [...prev, replyMsg]);
      }, 1200);
    }
  };

  const handleToggleBlock = (userId: string) => {
    let next: string[];
    if (blockedUserIds.includes(userId)) {
      next = blockedUserIds.filter(id => id !== userId);
    } else {
      next = [...blockedUserIds, userId];
    }
    setBlockedUserIds(next);
    localStorage.setItem('ahnyi_blocked_users', JSON.stringify(next));
  };

  const isSelectedUserBlocked = selectedUser ? blockedUserIds.includes(selectedUser.id) : false;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 pt-2 px-3 sm:px-4">
      <div className="glass-card rounded-3xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl h-[78vh] flex flex-col md:flex-row">
        {/* Left Sidebar: Contact List */}
        <div className={`w-full md:w-80 border-r border-white/10 flex flex-col bg-[#0F131C]/90 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#F6D365]" />
              <h2 className="font-bold text-white font-myanmar text-base">{t('inboxTitle')}</h2>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {availableContacts
              .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.handle.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isBlocked = blockedUserIds.includes(u.id);

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition hover:bg-white/5 ${
                      isSelected ? 'bg-white/10 border-l-4 border-[#D4AF37]' : ''
                    }`}
                  >
                    <div className="relative">
                      <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/30" />
                      {u.role === 'owner' && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121620] border border-[#D4AF37]">
                          <Crown className="w-2.5 h-2.5 text-[#F6D365] fill-[#F6D365]" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white truncate font-myanmar flex items-center gap-1">
                          {u.name}
                          {u.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        </span>
                        {isBlocked && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">@{u.handle}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right Area: Active Conversation */}
        <div className={`flex-1 flex flex-col bg-[#121622] ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {selectedUser ? (
            <>
              {/* Chat Top Bar */}
              <div className="p-3.5 border-b border-white/10 bg-[#0F131C] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 md:hidden"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/30"
                  />
                  <div>
                    <h3 className="font-semibold text-xs text-white font-myanmar flex items-center gap-1.5">
                      {selectedUser.name}
                      {selectedUser.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    </h3>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Online on AH NYI</span>
                    </p>
                  </div>
                </div>

                {/* Chat Action Options */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleBlock(selectedUser.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-myanmar transition flex items-center gap-1 ${
                      isSelectedUserBlocked ? 'bg-emerald-600 text-white' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isSelectedUserBlocked ? t('unblockUser') : t('blockUser')}</span>
                  </button>
                  <button
                    onClick={() => onReportUser(selectedUser)}
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-amber-400 transition"
                    title="Report"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 font-myanmar text-xs">
                    <MessageCircle className="w-10 h-10 text-gray-600 mb-2" />
                    <p>{t('noChatsYet')}</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFromMe = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3 text-xs font-myanmar shadow-md ${
                            isFromMe
                              ? 'gold-gradient-bg text-black font-medium rounded-br-none'
                              : 'bg-[#1C2230] text-gray-200 border border-white/5 rounded-bl-none'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isFromMe ? 'text-black/70' : 'text-gray-400'
                          }`}>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isFromMe && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#0F131C] flex items-center gap-2">
                <input
                  type="text"
                  disabled={isSelectedUserBlocked}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isSelectedUserBlocked ? t('userBlocked') : t('typeMessage')}
                  className="flex-1 bg-[#1A1F2C] text-xs text-white placeholder-gray-500 rounded-full px-4 py-2.5 border border-white/10 focus:outline-none focus:border-[#D4AF37] font-myanmar disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSelectedUserBlocked}
                  className="p-2.5 rounded-full gold-gradient-bg text-black hover:scale-105 active:scale-95 transition disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 font-myanmar">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">{t('inboxTitle')}</h3>
              <p className="text-xs text-gray-500 max-w-xs">{t('noChatsYet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
