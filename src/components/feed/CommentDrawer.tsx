import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  ShieldCheck, 
  Heart, 
  MessageCircle, 
  CornerDownRight, 
  Trash2 
} from 'lucide-react';
import { Comment, Post, User } from '../../types';
import { storage } from '../../services/storage';
import { useTranslation } from '../../hooks/useTranslation';

interface CommentDrawerProps {
  post: Post | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  post,
  currentUser,
  isOpen,
  onClose,
  onCommentAdded,
}) => {
  const { t, language } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
      setReplyingTo(null);
    }
  }, [isOpen, post]);

  const loadComments = async () => {
    if (!post) return;
    setLoading(true);
    const list = await storage.getComments(post.id);
    setComments(list);
    setLoading(false);
  };

  const handleStartReply = (comment: Comment) => {
    setReplyingTo(comment);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    const isOwner = currentUser.role === 'owner';
    const isPostAuthor = currentUser.id === post.authorId;
    const confirmMsg = isOwner && !isPostAuthor
      ? 'Owner အခွင့်အာဏာဖြင့် ဤမှတ်ချက်ကို ဖျက်ရန် သေချာပါသလား?'
      : 'ဤမှတ်ချက်ကို ဖျက်ရန် သေချာပါသလား?';

    if (window.confirm(confirmMsg)) {
      await storage.deleteComment(commentId, post.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentAdded();
    }
  };

  const handleToggleLikeComment = async (commentId: string) => {
    const result = await storage.toggleLikeComment(commentId, currentUser.id);
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const nextLikes = result.liked
          ? [...(c.likes || []), currentUser.id]
          : (c.likes || []).filter(id => id !== currentUser.id);
        return {
          ...c,
          likes: nextLikes,
          likesCount: result.likesCount
        };
      }
      return c;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newText.trim()) return;

    // Resolve parentId (if replying to an existing reply, chain to root parent)
    const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : undefined;

    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId: post.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorVerified: currentUser.isVerified,
      content: newText.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      likes: [],
      parentId,
      replyToAuthorName: replyingTo ? replyingTo.authorName : undefined,
      replyToAuthorId: replyingTo ? replyingTo.authorId : undefined
    };

    await storage.addComment(newComment);
    setComments(prev => [...prev, newComment]);
    setNewText('');
    setReplyingTo(null);
    onCommentAdded();

    // Trigger notification
    if (replyingTo && replyingTo.authorId !== currentUser.id) {
      // Notification to comment author
      storage.addNotification({
        id: `notif_rp_${Date.now()}`,
        recipientId: replyingTo.authorId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        type: 'comment',
        messageMy: `${currentUser.name} မှ သင်၏ မှတ်ချက်အား ပြန်လည်ဖြေကြား (RP) ခဲ့ပါသည်: "${newComment.content.substring(0, 30)}..."`,
        messageEn: `${currentUser.name} replied to your comment: "${newComment.content.substring(0, 30)}..."`,
        targetId: post.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } else if (post.authorId !== currentUser.id) {
      // Notification to post author
      storage.addNotification({
        id: `notif_comment_${Date.now()}`,
        recipientId: post.authorId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        type: 'comment',
        messageMy: `သင်၏ Post တွင် မှတ်ချက်ရေးသားခဲ့သည်: "${newComment.content.substring(0, 30)}..."`,
        messageEn: `commented on your post: "${newComment.content.substring(0, 30)}..."`,
        targetId: post.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  if (!isOpen || !post) return null;

  // Group comments into root comments and replies
  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative w-full max-w-lg bg-[#121620] border-t sm:border border-[#D4AF37]/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] h-[78vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0B0E14]/70">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#F6D365]" />
            <h3 className="font-semibold text-white font-myanmar">
              {t('comments')} ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rootComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 font-myanmar">
              <MessageCircle className="w-12 h-12 text-gray-600 mb-2" />
              <p className="text-sm">{t('noCommentsYet')}</p>
            </div>
          ) : (
            rootComments.map((rootComment) => {
              const replies = getReplies(rootComment.id);
              const isLiked = (rootComment.likes || []).includes(currentUser.id);
              const canDeleteRoot = currentUser.id === rootComment.authorId || currentUser.id === post.authorId || currentUser.role === 'owner';

              return (
                <div key={rootComment.id} className="space-y-2">
                  {/* Root Comment Item */}
                  <div className="flex gap-3">
                    <img
                      src={rootComment.authorAvatar}
                      alt={rootComment.authorName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#D4AF37]/30 mt-1"
                    />
                    <div className="flex-1 bg-[#1A1F2C] p-3 rounded-2xl border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white font-myanmar flex items-center gap-1">
                          {rootComment.authorName}
                          {rootComment.authorVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                          )}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>
                            {new Date(rootComment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {canDeleteRoot && (
                            <button
                              onClick={() => handleDeleteComment(rootComment.id)}
                              className="text-gray-500 hover:text-red-400 transition"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-200 font-myanmar leading-relaxed whitespace-pre-wrap">
                        {rootComment.content}
                      </p>

                      {/* Comment Actions: Like & Reply (RP) */}
                      <div className="flex items-center gap-4 pt-1.5 text-xs text-gray-400 font-myanmar">
                        <button
                          onClick={() => handleToggleLikeComment(rootComment.id)}
                          className={`flex items-center gap-1 transition ${
                            isLiked ? 'text-red-400 font-semibold' : 'hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400' : ''}`} />
                          <span className="text-[11px] font-mono">{(rootComment.likesCount || 0) > 0 ? rootComment.likesCount : ''}</span>
                        </button>

                        <button
                          onClick={() => handleStartReply(rootComment)}
                          className="flex items-center gap-1 text-[#F6D365] hover:underline transition font-semibold text-[11px]"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>{language === 'my' ? 'RP ပြန်မည်' : 'Reply'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Replies */}
                  {replies.length > 0 && (
                    <div className="ml-8 sm:ml-10 border-l-2 border-[#D4AF37]/30 pl-3 pt-1 space-y-2.5">
                      {replies.map((reply) => {
                        const isReplyLiked = (reply.likes || []).includes(currentUser.id);
                        const canDeleteReply = currentUser.id === reply.authorId || currentUser.id === post.authorId || currentUser.role === 'owner';

                        return (
                          <div key={reply.id} className="flex gap-2.5">
                            <img
                              src={reply.authorAvatar}
                              alt={reply.authorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#D4AF37]/30 mt-0.5"
                            />
                            <div className="flex-1 bg-[#151922] p-2.5 rounded-2xl border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-white font-myanmar flex items-center gap-1">
                                  {reply.authorName}
                                  {reply.authorVerified && (
                                    <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                                  )}
                                  {reply.replyToAuthorName && (
                                    <span className="text-[11px] text-[#F6D365]/80 font-normal">
                                      @{reply.replyToAuthorName} သို့
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span>
                                    {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {canDeleteReply && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-gray-500 hover:text-red-400 transition"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-gray-200 font-myanmar leading-relaxed whitespace-pre-wrap">
                                {reply.content}
                              </p>

                              {/* Reply Item Actions */}
                              <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400 font-myanmar">
                                <button
                                  onClick={() => handleToggleLikeComment(reply.id)}
                                  className={`flex items-center gap-1 transition ${
                                    isReplyLiked ? 'text-red-400 font-semibold' : 'hover:text-white'
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${isReplyLiked ? 'fill-red-400' : ''}`} />
                                  <span className="font-mono">{(reply.likesCount || 0) > 0 ? reply.likesCount : ''}</span>
                                </button>

                                <button
                                  onClick={() => handleStartReply(reply)}
                                  className="flex items-center gap-1 text-[#F6D365] hover:underline transition font-semibold text-[10px]"
                                >
                                  <CornerDownRight className="w-3 h-3" />
                                  <span>{language === 'my' ? 'RP' : 'Reply'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Replying To Banner */}
        {replyingTo && (
          <div className="px-4 py-2 bg-[#1A1F2C] border-t border-[#D4AF37]/30 flex items-center justify-between text-xs text-gray-300 font-myanmar animate-fadeIn">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-[#F6D365] shrink-0" />
              <span className="truncate">
                <strong>@{replyingTo.authorName}</strong> သို့ ပြန်လည်ဖြေကြားနေပါသည် (Replying)...
              </span>
            </div>
            <button
              onClick={handleCancelReply}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white shrink-0 ml-2"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-[#0B0E14] flex items-center gap-2">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={
              replyingTo
                ? `@{replyingTo.authorName} သို့ ပြန်လည်ဖြေကြားမည် (RP)...`
                : t('writeComment')
            }
            className="flex-1 bg-[#1A1F2C] text-sm text-white placeholder-gray-500 rounded-full px-4 py-2 border border-white/10 focus:outline-none focus:border-[#D4AF37] font-myanmar"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="p-2 rounded-full gold-gradient-bg text-black hover:scale-105 active:scale-95 transition disabled:opacity-40 shrink-0"
            title="Send comment"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
