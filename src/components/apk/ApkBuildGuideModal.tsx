import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  X, 
  Terminal, 
  CheckCircle, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ApkBuildGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkBuildGuideModal: React.FC<ApkBuildGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const [showManualNotice, setShowManualNotice] = useState<boolean>(false);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 4000);
        }
        setDeferredPrompt(null);
      } catch (e) {
        setShowManualNotice(true);
      }
    } else {
      setShowManualNotice(true);
      setTimeout(() => setShowManualNotice(false), 8000);
    }
  };

  const handleDownloadAndroidConfig = () => {
    const configData = {
      appId: "com.ahnyi.social",
      appName: "AH NYI",
      webDir: "dist",
      bundledWebRuntime: false,
      server: {
        androidScheme: "https"
      },
      android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true
      },
      plugins: {
        Camera: {
          permissions: ["camera", "photos"]
        }
      }
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacitor.config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#121620] border border-[#D4AF37]/40 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden font-myanmar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0E14]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gold-gradient-bg text-black shadow-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {t('apkTitle')}
              </h3>
              <p className="text-xs text-gray-400">AH NYI Android App (PWA & Native APK Package)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-300 leading-relaxed">
          {/* Standalone Brand Notice */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/20 via-[#161C27] to-[#D4AF37]/10 border border-[#D4AF37]/50 space-y-2">
            <div className="flex items-center gap-2 text-[#F6D365] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-[#F6D365]" />
              <span>Google Logo နှင့် Browser Bar များ မပါဘဲ ကိုယ်ပိုင် App ဖြစ်စေရန်:</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Browser Link အနေဖြင့် ဖွင့်ကြည့်ပါက Browser ခေါင်းစဉ်များ ပေါ်နေနိုင်ပါသည်။ အောက်ပါ <strong>"Install App"</strong> (သို့မဟုတ်) Browser Menu မှ <strong>"Add to Home Screen"</strong> ကို နှိပ်ပြီး သွင်းယူလိုက်ပါက Google Logo နှင့် Address Bar များ လုံးဝမပါဘဲ ဖုန်းမျက်နှာပြင်တွင် <strong>AH NYI ရွှေရောင် Logo</strong> ဖြင့် Full-Screen သီးသန့် App အစစ်အတိုင်း အသုံးပြုနိုင်ပါပြီ။
            </p>
          </div>

          {/* Method 1: Instant 1-Tap PWA Install on Android */}
          <div className="p-5 rounded-2xl bg-[#161C27] border border-[#D4AF37]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#F6D365] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                နည်းလမ်း (၁) - Google Logo မပါဘဲ ဖုန်းထဲသို့ တိုက်ရိုက် App အဖြစ် Install လုပ်နည်း
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                အလွယ်ကူဆုံး (၁ မိနစ်)
              </span>
            </div>
            <p>
              AH NYI တွင် Standalone PWA စနစ် ထည့်သွင်းထားသောကြောင့် ဖုန်းထဲတွင် သီးခြား App တစ်ခုအဖြစ် တိုက်ရိုက် Install ပြုလုပ်နိုင်ပါသည်။
            </p>

            {installSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>AH NYI App ကို ဖုန်းထဲသို့ အောင်မြင်စွာ Install ပြုလုပ်ပြီးပါပြီ! ပင်မမျက်နှာပြင် (Home Screen) တွင် ကြည့်ရှုနိုင်ပါသည်။</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleInstallPWA}
                className="flex-1 py-3 px-4 rounded-xl gold-gradient-bg text-black font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>ဖုန်းထဲတွင် တိုက်ရိုက် Install ပြုလုပ်မည် (One-Tap Install)</span>
              </button>
            </div>

            {showManualNotice && (
              <div className="p-3.5 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F6D365] text-xs flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                <p className="font-bold flex items-center gap-1.5 text-white">
                  <span>📱 Browser Menu မှ အောက်ပါအတိုင်း သွင်းယူနိုင်ပါသည်:</span>
                </p>
                <p className="text-[11px] text-gray-200 leading-relaxed">
                  ဖုန်းမျက်နှာပြင် ညာဘက်အပေါ်ထောင့်ရှိ <strong className="text-[#F6D365] bg-black/40 px-1.5 py-0.5 rounded">⋮ (အစက် ၃ စက်)</strong> ကို နှိပ်ပြီး <strong className="text-[#F6D365]">"Install app"</strong> (သို့မဟုတ် <strong>"Add to Home screen"</strong>) ကို ရွေးချယ်ပေးပါက ဖုန်းထဲသို့ ချက်ချင်း သွင်းယူသွားမည် ဖြစ်ပါသည်။
                </p>
              </div>
            )}

            <ol className="list-decimal list-inside space-y-1.5 text-gray-400 pt-2 border-t border-white/5">
              <li>သင့်ဖုန်း Browser ၏ ညာဘက်အပေါ်ထောင့်ရှိ Menu <strong>( ⋮ )</strong> ကို နှိပ်ပါ။</li>
              <li><strong>"Add to Home screen"</strong> (သို့မဟုတ် <strong>"Install App"</strong> / <strong>"ပင်မမျက်နှာပြင်သို့ ထည့်မည်"</strong>) ကို ရွေးချယ်ပါ။</li>
              <li>ဖုန်းမျက်နှာပြင်တွင် <strong>AH NYI Gold Icon</strong> သီးသန့် ပေါ်လာပါမည်။ ဖွင့်လိုက်ပါက Google Logo လုံးဝမပါဘဲ Full-Screen App ဖြစ်သွားပါမည်။</li>
            </ol>
          </div>

          {/* Method 2: Standalone .APK File Generation via Capacitor / Android Studio */}
          <div className="p-5 rounded-2xl bg-[#161C27] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#F6D365]" />
                နည်းလမ်း (၂) - Standalone Android .APK ထုတ်လုပ်ရန် Source Code & Commands
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F6D365]">
                Capacitor Configured
              </span>
            </div>
            <p className="text-gray-400">
              Native .apk တည်ဆောက်ရန် လိုအပ်သော <code className="text-[#F6D365]">capacitor.config.json</code> ကို Project ထဲတွင် ထည့်သွင်းထားပြီး ဖြစ်ပါသည်။ အောက်ပါ ခလုတ်ကို နှိပ်၍ Android Config ဖိုင်ကို ကူးယူနိုင်ပါသည်:
            </p>

            <button
              onClick={handleDownloadAndroidConfig}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-[#F6D365]" />
              <span>capacitor.config.json ဖိုင် ဒေါင်းလုဒ်ရယူမည်</span>
            </button>

            {/* Step 1 Code */}
            <div className="space-y-1">
              <span className="font-semibold text-gray-200">အဆင့် ၁ - Dependencies နှင့် Capacitor ထည့်သွင်းခြင်း:</span>
              <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl font-mono text-emerald-400 border border-white/10">
                <code>npm install @capacitor/core @capacitor/cli @capacitor/android</code>
                <button
                  onClick={() => copyToClipboard('npm install @capacitor/core @capacitor/cli @capacitor/android', 'c1')}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  {copiedCmd === 'c1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2 Code */}
            <div className="space-y-1">
              <span className="font-semibold text-gray-200">အဆင့် ၂ - Project ကို Build ပြုလုပ်ပြီး Android ပရောဂျက် ဖန်တီးခြင်း:</span>
              <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl font-mono text-emerald-400 border border-white/10">
                <code>npm run build && npx cap add android && npx cap sync</code>
                <button
                  onClick={() => copyToClipboard('npm run build && npx cap add android && npx cap sync', 'c2')}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  {copiedCmd === 'c2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 3 Code */}
            <div className="space-y-1">
              <span className="font-semibold text-gray-200">အဆင့် ၃ - Android Studio ဖြင့် APK ထုတ်ယူခြင်း:</span>
              <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl font-mono text-emerald-400 border border-white/10">
                <code>npx cap open android</code>
                <button
                  onClick={() => copyToClipboard('npx cap open android', 'c3')}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  {copiedCmd === 'c3' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-gray-300">
              Android Studio ပွင့်လာပါက <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> ကို နှိပ်ပြီး ထွက်လာသော <strong>.apk</strong> ဖိုင်ကို မည်သည့် Android ဖုန်းတွင်မဆို Install ပြုလုပ်နိုင်ပါသည်။
            </p>
          </div>

          {/* Method 3: Pure Android WebView Template (MainActivity.java & AndroidManifest.xml) */}
          <div className="p-5 rounded-2xl bg-[#161C27] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#F6D365]" />
                နည်းလမ်း (၃) - Pure Android WebView APK Source Code (Browser Bar လုံးဝမပါ)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Full Screen
              </span>
            </div>
            <p className="text-gray-400">
              Android Studio တွင် Project အသစ်ဖန်တီး၍ တိုက်ရိုက် Build ပြုလုပ်လိုပါက အောက်ပါ <code className="text-[#F6D365]">MainActivity.java</code> နှင့် <code className="text-[#F6D365]">AndroidManifest.xml</code> Source Code များကို ကူးယူအသုံးပြုနိုင်ပါသည် (Full Screen ဖြစ်ပြီး Camera နှင့် Microphone ကို WebChromeClient ဖြင့် ခွင့်ပြုပေးထားပါသည်):
            </p>

            {/* MainActivity.java Code */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200">MainActivity.java:</span>
                <button
                  onClick={() => copyToClipboard(`package com.ahnyi.social;

import android.Manifest;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getSupportActionBar() != null) getSupportActionBar().hide();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("https://ais-dev-vlhr3flzq4lywviw34rcpt-94404465105.asia-east1.run.app");

        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 1);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}`, 'c4')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-xs text-[#F6D365] flex items-center gap-1 transition"
                >
                  {copiedCmd === 'c4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'c4' ? 'ကူးယူပြီး' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-black/60 p-3 rounded-xl font-mono text-[11px] text-gray-300 border border-white/10 max-h-40 overflow-y-auto no-scrollbar">
{`// Full-Screen Android WebView (No Browser Header, Camera/Mic enabled)
package com.ahnyi.social;

import android.Manifest;
import android.os.Bundle;
import android.webkit.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getSupportActionBar() != null) getSupportActionBar().hide();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("https://ais-dev-vlhr3flzq4lywviw34rcpt-94404465105.asia-east1.run.app");

        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 1);
    }
}`}
              </pre>
            </div>

            {/* AndroidManifest.xml Code */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200">AndroidManifest.xml:</span>
                <button
                  onClick={() => copyToClipboard(`<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ahnyi.social">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="AH NYI"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`, 'c5')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-xs text-[#F6D365] flex items-center gap-1 transition"
                >
                  {copiedCmd === 'c5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'c5' ? 'ကူးယူပြီး' : 'Copy XML'}</span>
                </button>
              </div>
              <pre className="bg-black/60 p-3 rounded-xl font-mono text-[11px] text-gray-300 border border-white/10 max-h-32 overflow-y-auto no-scrollbar">
{`<manifest package="com.ahnyi.social">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <application
        android:label="AH NYI"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:hardwareAccelerated="true">
        ...
    </application>
</manifest>`}
              </pre>
            </div>
          </div>

          {/* Android Permissions Configured */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <h5 className="font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
              Android Permissions သတ်မှတ်ချက်များ (Pre-configured in App):
            </h5>
            <ul className="list-disc list-inside space-y-1 text-gray-400 font-mono text-[11px]">
              <li>android.permission.CAMERA (ဓာတ်ပုံနှင့် ဗီဒီယို ရိုက်ကူးရန်)</li>
              <li>android.permission.RECORD_AUDIO (အသံဖမ်းယူရန်)</li>
              <li>android.permission.READ_MEDIA_IMAGES (Gallery မှ ဓာတ်ပုံတင်ရန်)</li>
              <li>android.permission.READ_MEDIA_VIDEO (Gallery မှ ဗီဒီယိုတင်ရန်)</li>
              <li>android.permission.INTERNET (Online &amp; Cloud Sync အတွက်)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0B0E14] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl gold-gradient-bg text-black font-semibold text-xs shadow-lg hover:brightness-110 transition"
          >
            နားလည်ပါပြီ
          </button>
        </div>
      </div>
    </div>
  );
};
