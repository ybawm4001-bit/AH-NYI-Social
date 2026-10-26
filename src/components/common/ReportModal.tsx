import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { storage } from '../../services/storage';
import { useTranslation } from '../../hooks/useTranslation';
import { User, Post, ReportItem } from '../../types';

interface ReportModalProps {
  target: { type: 'post' | 'user'; item: Post | User } | null;
  currentUser: User;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  target,
  currentUser,
  onClose,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string>('Spam or Scam (လိမ်လည်မှု/Spam)');
  const [details, setDetails] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!target) return null;

  const reasonsList = [
    'Spam or Scam (လိမ်လည်မှု/Spam)',
    'Hate Speech or Harassment (အမုန်းစကား/စော်ကားမှု)',
    'Inappropriate Content (မသင့်လျော်သော အကြောင်းအရာ)',
    'Copyright Violation (မူပိုင်ခွင့် ချိုးဖောက်မှု)',
    'Misinformation (သတင်းမှား)',
    'Other (အခြား)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPost = target.type === 'post';
    const postItem = target.item as Post;
    const userItem = target.item as User;

    const newReport: ReportItem = {
      id: `rep_${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      targetType: target.type,
      targetId: target.item.id,
      targetPreview: isPost ? postItem.caption : `@${userItem.handle} (${userItem.name})`,
      reason: reason,
      details: details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await storage.addReport(newReport);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-myanmar">
      <div className="relative w-full max-w-md rounded-3xl bg-[#121620] border border-amber-500/30 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">{t('reportPost')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">တိုင်ကြားချက် ပေးပို့ပြီးပါပြီ</h4>
            <p className="text-xs text-gray-400">Owner နှင့် Admin များမှ စိစစ်ပြီး အရေးယူဆောင်ရွက်ပါမည်။</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="text-gray-400 font-semibold block">တိုင်ကြားလိုသည့် အကြောင်းရင်း ရွေးချယ်ပါ</label>
              <div className="space-y-1.5">
                {reasonsList.map((r) => (
                  <label key={r} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-gray-200">
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[#D4AF37]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">အသေးစိတ် ရှင်းပြချက် (စိတ်ကြိုက်)</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="အကြောင်းအရာ အသေးစိတ် ရေးသားပါ..."
                className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg"
              >
                တိုင်ကြားမည်
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
