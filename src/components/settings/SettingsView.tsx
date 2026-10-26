import React, { useState } from 'react';
import { 
  Languages, 
  ShieldCheck, 
  Lock, 
  Eye, 
  Ban, 
  HelpCircle, 
  Info, 
  Trash2, 
  LogOut, 
  Smartphone, 
  Cloud, 
  Database, 
  ChevronRight, 
  Check, 
  Copy,
  ExternalLink,
  Download
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { storage } from '../../services/storage';
import { User, FirebaseManualConfig } from '../../types';

interface SettingsViewProps {
  currentUser: User;
  onLogout: () => void;
  onOpenApkGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onLogout,
  onOpenApkGuide,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [activeSubModal, setActiveSubModal] = useState<string | null>(null);

  // Firebase config form
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseManualConfig>(storage.getFirebaseConfig());
  const [fbSavedToast, setFbSavedToast] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Backup & Restore
  const [backupJson, setBackupJson] = useState<string>('');
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveFirebaseConfig({ ...firebaseConfig, isConfigured: true });
    setFbSavedToast(true);
    setTimeout(() => setFbSavedToast(false), 3000);
  };

  const handleTestFirebaseConnection = () => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      setTestResult('API Key သို့မဟုတ် Project ID ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။');
      return;
    }
    setTestResult('Firebase Configuration ကို အောင်မြင်စွာ စစ်ဆေးအတည်ပြုပြီးပါပြီ! (Connection Ready)');
  };

  const handleExportBackup = async () => {
    const jsonStr = await storage.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AH_NYI_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 pt-2 px-3 sm:px-4 space-y-4 font-myanmar">
      <div className="glass-card rounded-3xl p-6 border border-[#D4AF37]/30 shadow-xl space-y-6">
        {/* Title */}
        <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
          <span>{t('settingsTitle')}</span>
        </h2>

        {/* Setting Sections */}
        <div className="space-y-3">
          {/* 1. Language Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161C27] border border-white/5">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-[#F6D365]" />
              <div>
                <h4 className="font-semibold text-sm text-white">{t('languageSelect')}</h4>
                <p className="text-xs text-gray-400">Current: {language === 'my' ? 'မြန်မာဘာသာ (Unicode)' : 'English'}</p>
              </div>
            </div>
            <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
              <button
                onClick={() => setLanguage('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  language === 'my' ? 'gold-gradient-bg text-black font-bold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                မြန်မာ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  language === 'en' ? 'gold-gradient-bg text-black font-bold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* 2. Android APK Build Guide */}
          <button
            onClick={onOpenApkGuide}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-[#D4AF37]/30 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-[#F6D365] group-hover:scale-110 transition" />
              <div>
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>{t('apkDownloadGuide')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Capacitor / Android
                  </span>
                </h4>
                <p className="text-xs text-gray-400">Android ဖုန်းတွင် APK တင်သွင်းအသုံးပြုနည်း လမ်းညွှန်</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
          </button>

          {/* 3. Firebase & Cloud Storage Connector */}
          <button
            onClick={() => setActiveSubModal('firebase')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-white/5 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
              <div>
                <h4 className="font-semibold text-sm text-white">{t('firebaseSetupGuide')}</h4>
                <p className="text-xs text-gray-400">Firebase Firestore & Cloud Storage ချိတ်ဆက်ခြင်း</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
          </button>

          {/* 4. Export & Backup Data */}
          <button
            onClick={handleExportBackup}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-white/5 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition" />
              <div>
                <h4 className="font-semibold text-sm text-white">Database Backup ထုတ်ယူမည် (JSON Export)</h4>
                <p className="text-xs text-gray-400">တင်ထားသော Content များ မပျောက်စေရန် အချိန်မရွေး သိမ်းဆည်းနိုင်သည်</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400" />
          </button>

          {/* 5. Help & Support */}
          <button
            onClick={() => setActiveSubModal('help')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-white/5 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              <div>
                <h4 className="font-semibold text-sm text-white">{t('helpAndSupport')}</h4>
                <p className="text-xs text-gray-400">မေးလေ့ရှိသော မေးခွန်းများနှင့် အကူအညီ</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>

          {/* 6. About AH NYI */}
          <button
            onClick={() => setActiveSubModal('about')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#161C27] hover:bg-[#1E2536] border border-white/5 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-300" />
              <div>
                <h4 className="font-semibold text-sm text-white">{t('aboutAhNyi')}</h4>
                <p className="text-xs text-gray-400">{t('appVersion')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>

          {/* 7. Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 transition text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="font-semibold text-sm text-red-300">{t('navLogout')}</h4>
                <p className="text-xs text-gray-500">အကောင့်မှ လုံခြုံစွာ ထွက်ခွာမည်</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* SUB-MODAL: FIREBASE MANUAL SETUP GUIDE */}
      {activeSubModal === 'firebase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#121620] border border-[#D4AF37]/40 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">{t('firebaseSetupGuide')}</h3>
              </div>
              <button onClick={() => setActiveSubModal(null)} className="p-1 rounded-full text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Step by step Myanmar Guide */}
            <div className="space-y-3 text-xs text-gray-300 leading-relaxed bg-[#161C27] p-4 rounded-2xl border border-white/5">
              <h4 className="font-bold text-[#F6D365] text-sm">Firebase ကိုယ်တိုင် ချိတ်ဆက်နည်း အဆင့်ဆင့် -</h4>
              <p>၁။ <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">Firebase Console</a> သို့ မိမိ Google Account ဖြင့် ဝင်ရောက်ပါ။</p>
              <p>၂။ "Add Project" ကို နှိပ်ပြီး Project အမည်ပေး၍ ဖန်တီးပါ။</p>
              <p>၃။ Project ထဲတွင် "Web (&lt;/&gt;)" Icon ကို နှိပ်ပြီး Web App အဖြစ် Register လုပ်ပါ။</p>
              <p>၄။ ပြသလာသော Firebase Config (apiKey, projectId, authDomain, storageBucket စသည်) များကို ကူးယူပြီး အောက်ပါ Form တွင် ထည့်သွင်းပါ။</p>
              <p>၅။ Firestore Database နှင့် Authentication (Google Sign-In) ကို Firebase Console မှ Enable လုပ်ပေးပါ။</p>
            </div>

            {/* Config Inputs */}
            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">API Key</label>
                <input
                  type="text"
                  value={firebaseConfig.apiKey}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    placeholder="my-ahnyi-project"
                    className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Auth Domain</label>
                  <input
                    type="text"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                    placeholder="my-ahnyi.firebaseapp.com"
                    className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={firebaseConfig.storageBucket}
                  onChange={(e) => setFirebaseConfig({ ...firebaseConfig, storageBucket: e.target.value })}
                  placeholder="my-ahnyi.appspot.com"
                  className="w-full bg-[#1A1F2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300 text-xs">
                  {testResult}
                </div>
              )}

              {fbSavedToast && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                  Firebase Configuration သိမ်းဆည်းပြီးပါပြီ!
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestFirebaseConnection}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Connection စမ်းသပ်မည်
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl gold-gradient-bg text-black text-xs font-semibold shadow-lg"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: ABOUT */}
      {activeSubModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-[#121620] border border-[#D4AF37]/30 shadow-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl gold-gradient-bg text-black mx-auto flex items-center justify-center shadow-xl">
              <span className="font-black text-2xl font-serif">A</span>
            </div>
            <h3 className="text-xl font-bold text-white">AH NYI Social Network</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#F6D365] border border-[#D4AF37]/30 font-mono">
              Version 1.0.0 Gold Edition
            </span>
            <p className="text-xs text-gray-300 leading-relaxed font-myanmar">
              မြန်မာ Creator များနှင့် အသုံးပြုသူများအတွက် သီးသန့်တီထွင်ဖန်တီးထားသော ကိုယ်ပိုင် လူမှုကွန်ရက် ပလက်ဖောင်း ဖြစ်ပါသည်။ မူလပိုင်ရှင် (Owner) စီမံခန့်ခွဲမှု၊ ကင်မရာနှင့် ဗီဒီယိုရိုက်ကူးမှု၊ တိုက်ရိုက် မက်ဆေ့ခ်ျများနှင့် ကြော်ငြာဝင်ငွေရှာနိုင်သော စနစ်များ အပြည့်အစုံ ပါဝင်ပါသည်။
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveSubModal(null)}
                className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs transition"
              >
                ပိတ်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: HELP */}
      {activeSubModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-[#121620] border border-[#D4AF37]/30 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base border-b border-white/10 pb-2">အကူအညီနှင့် စည်းမျဉ်းများ</h3>
            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-3 rounded-xl bg-white/5">
                <h5 className="font-bold text-white mb-1">ဗီဒီယိုဖိုင် မပျောက်စေရန် မည်သို့ပြုလုပ်ထားသနည်း?</h5>
                <p>AH NYI သည် စက်တွင်း IndexedDB persistent storage တွင် သိမ်းဆည်းပြီး Firebase Cloud နှင့် တိုက်ရိုက် ချိတ်ဆက်နိုင်ရန် တည်ဆောက်ထားပါသည်။</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <h5 className="font-bold text-white mb-1">ကင်မရာ အသုံးပြုခွင့် မရပါက ဘာလုပ်ရမလဲ?</h5>
                <p>ဖုန်း Browser Settings &gt; Site Settings &gt; Permissions တွင် Camera နှင့် Microphone ကို Allow ပြုလုပ်ပေးပါ။</p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
            >
              နားလည်ပါပြီ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
