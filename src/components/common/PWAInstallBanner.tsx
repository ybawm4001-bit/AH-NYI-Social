import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  CheckCircle, 
  Share, 
  PlusSquare, 
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone mode (no browser headers) or user closed banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    // 1. Try native browser prompt if available
    if (isInstallable) {
      try {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => setIsDismissed(true), 3500);
          return;
        }
      } catch (e) {
        console.warn('Native prompt error:', e);
      }
    }

    // 2. If native prompt is not available or in preview mode, ALWAYS open the interactive in-app guide!
    // Never call alert() which gets blocked in iframes!
    setShowGuideModal(true);
  };

  return (
    <>
      {/* Top Banner */}
      <div className="w-full bg-gradient-to-r from-[#D4AF37]/25 via-[#1A202C] to-[#D4AF37]/25 border-b border-[#D4AF37]/40 py-2.5 px-4 text-xs font-myanmar shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg gold-gradient-bg text-black shrink-0 shadow-md">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">
              {installSuccess 
                ? 'AH NYI App ကို ဖုန်းထဲသို့ သွင်းယူပြီးပါပြီ!' 
                : 'Browser Header မပါဘဲ ဖုန်းထဲတွင် App အဖြစ် သွင်းယူပါ'}
            </p>
            <p className="text-[11px] text-[#F6D365] truncate">
              {installSuccess
                ? 'ပင်မမျက်နှာပြင်တွင် ကြည့်ရှုအသုံးပြုနိုင်ပါပြီ ✨'
                : 'Google Logo မပါ၊ Full-Screen သီးသန့် Standalone App အဖြစ် အသုံးပြုနိုင်သည်'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!installSuccess ? (
            <button
              onClick={handleInstallClick}
              className="py-1.5 px-3.5 rounded-xl gold-gradient-bg text-black font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition hover:brightness-110 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install ပြုလုပ်မည်</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>ပြီးပါပြီ</span>
            </span>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
            title="ပိတ်မည်"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Install Guide Modal (Opens immediately on click when native prompt isn't directly invocable) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-myanmar">
          <div className="w-full max-w-md rounded-3xl bg-[#161C27] border border-[#D4AF37]/50 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl gold-gradient-bg text-black shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ဖုန်းထဲတွင် App အဖြစ် တိုက်ရိုက်သွင်းနည်း
                  </h3>
                  <p className="text-[11px] text-[#F6D365]">Google Logo နှင့် Browser Bar များ မပါတော့ပါ</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Specific Steps */}
            {isIOS ? (
              // iOS Safari Instructions
              <div className="space-y-3">
                <p className="text-xs text-gray-300">
                  iPhone / iPad ၏ Safari Browser တွင် အောက်ပါအဆင့်အတိုင်း အလွယ်တကူ သွင်းယူနိုင်ပါသည်:
                </p>
                <ol className="space-y-2 text-xs text-gray-200 bg-black/40 p-3.5 rounded-2xl border border-white/10">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Safari Browser ၏ အောက်ခြေရှိ <strong>Share (မျှဝေရန် <Share className="w-3.5 h-3.5 inline mx-0.5 text-[#F6D365]" />)</strong> ခလုတ်ကို နှိပ်ပါ။</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>မီနူးတွင် အောက်သို့ဆွဲချပြီး <strong>"Add to Home Screen" (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#F6D365]" /> ပင်မမျက်နှာပြင်သို့ ထည့်မည်)</strong> ကို နှိပ်ပါ။</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>ညာဘက်အပေါ်ရှိ <strong>"Add"</strong> ကို နှိပ်လိုက်ပါက သင့်ဖုန်းမျက်နှာပြင်တွင် AH NYI App ရောက်ရှိပါပြီ။</span>
                  </li>
                </ol>
              </div>
            ) : (
              // Android Chrome / Samsung Browser Instructions
              <div className="space-y-3">
                <p className="text-xs text-gray-300">
                  Android ဖုန်း၏ <strong>Chrome</strong> သို့မဟုတ် <strong>Browser</strong> တွင် အောက်ပါ ရိုးရှင်းသော အဆင့် ၃ ဆင့်ဖြင့် App ကို တိုက်ရိုက်သွင်းနိုင်ပါသည်:
                </p>

                <div className="space-y-2.5 bg-black/40 p-4 rounded-2xl border border-white/10 text-xs text-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">Browser Menu ကို နှိပ်ပါ</p>
                      <p className="text-[11px] text-gray-400">
                        ဖုန်းမျက်နှာပြင် ညာဘက်အပေါ်ထောင့်ရှိ မီနူး <strong className="text-[#F6D365] bg-white/10 px-1.5 py-0.5 rounded">⋮ (အစက် ၃ စက်)</strong> ကို နှိပ်ပါ။
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">"Install app" သို့မဟုတ် "Add to Home screen" ကို ရွေးပါ</p>
                      <p className="text-[11px] text-gray-400">
                        ပေါ်လာသော စာရင်းထဲမှ <strong className="text-[#F6D365]">"Install app"</strong> (သို့မဟုတ် <strong>"ပင်မမျက်နှာပြင်သို့ ထည့်မည်"</strong>) ကို နှိပ်ပါ။
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-white">"Install" ကို အတည်ပြုပါ</p>
                      <p className="text-[11px] text-gray-400">
                        ဖုန်း Home Screen တွင် Google Logo မပါဘဲ <strong>AH NYI ရွှေရောင် Logo</strong> ဖြင့် Full-Screen App ပေါ်လာပါမည်။
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Try Native Trigger Button if available */}
            {isInstallable && (
              <button
                onClick={async () => {
                  await install();
                  setShowGuideModal(false);
                }}
                className="w-full py-3 rounded-xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>ယခုချက်ချင်း Install ပြုလုပ်မည် (Direct Prompt)</span>
              </button>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition"
            >
              နားလည်ပါပြီ (ပိတ်မည်)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
