"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, Lock, Unlock, ShieldCheck, UserMinus } from "lucide-react";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";

export default function PrivacyPage() {
  const router = useRouter();
  const socket = useSocket();
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState({
    isPrivate: false,
    lastSeenVisibility: "everyone",
    readReceipts: true,
  });

  useEffect(() => {
    API.authTest().then(data => {
      setPrivacy({
        isPrivate: data.user.isPrivate,
        lastSeenVisibility: data.user.lastSeenVisibility,
        readReceipts: data.user.readReceipts,
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  const toggle = async (key: keyof typeof privacy) => {
    try {
      const newValue = !privacy[key];
      setPrivacy(prev => ({ ...prev, [key]: newValue }));
      await API.updateSettings({ [key]: newValue });
      socket?.emit("update_user_prefs");
    } catch (err) {
      console.error(err);
      // Revert on failure
      setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const updateVisibility = async (value: string) => {
    try {
      setPrivacy(prev => ({ ...prev, lastSeenVisibility: value }));
      await API.updateSettings({ lastSeenVisibility: value });
      socket?.emit("update_user_prefs");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Top Bar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Privacy & Security</h1>
        </div>

        <section className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Account Privacy</h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <ToggleRow 
                icon={privacy.isPrivate ? <Lock size={20} /> : <Unlock size={20} />} 
                title="Private Account" 
                desc="Only followers can see your stories"
                enabled={privacy.isPrivate}
                onToggle={() => toggle("isPrivate")}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Chat Privacy</h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <ToggleRow 
                icon={<ShieldCheck size={20} />} 
                title="Read Receipts" 
                desc="Let others know when you've read messages"
                enabled={privacy.readReceipts}
                onToggle={() => toggle("readReceipts")}
              />
              
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary rounded-xl text-primary">
                    <Eye size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Last Seen Visibility</p>
                    <p className="text-xs text-muted-foreground">Who can see when you're online</p>
                  </div>
                </div>
                <div className="flex gap-2 p-1 bg-background/50 rounded-xl border border-white/5">
                  {["everyone", "followers", "nobody"].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateVisibility(v)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${privacy.lastSeenVisibility === v ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => router.push("/profile/blocked")}
            className="w-full flex items-center justify-between p-5 bg-card/50 rounded-3xl border border-white/5 hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl">
                <UserMinus size={20} />
              </div>
              <p className="font-bold text-white">Blocked Users</p>
            </div>
            <div className="text-muted-foreground/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </section>

        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-primary/80 leading-relaxed font-medium text-center">
          Security is our priority. Your messages are protected with end-to-end industry standards.
        </div>
      </main>
    </div>
  );
}

function ToggleRow({ icon, title, desc, enabled, onToggle }: { 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  enabled: boolean, 
  onToggle: () => void 
}) {
  return (
    <div className="flex items-center justify-between p-5 group">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl transition-all duration-300 ${enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div>
          <p className="font-bold text-white">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-primary focus:ring-2 ${enabled ? "bg-primary" : "bg-white/10"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
