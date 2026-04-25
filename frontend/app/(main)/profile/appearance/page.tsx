"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Moon, Sun, Type, Image as ImageIcon, Palette, Trash2, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

export default function AppearancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    theme: "dark",
    fontSize: "medium",
    accentColor: "#a855f7",
    chatWallpaper: "",
  });

  useEffect(() => {
    API.authTest().then(data => {
      if (data.user.settings) {
        setSettings(data.user.settings);
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  const updateSetting = async (key: string, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await API.updateSettings({ settings: newSettings });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await API.uploadFile(formData);
        updateSetting("chatWallpaper", res.fileUrl);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

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
          <h1 className="text-xl font-bold text-white">Appearance</h1>
        </div>

        <section className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Theme</h3>
            <div className="grid grid-cols-2 gap-4">
              <ThemeCard 
                active={settings.theme === "dark"} 
                onClick={() => updateSetting("theme", "dark")} 
                icon={<Moon size={24} />} 
                label="Dark Mode" 
              />
              <ThemeCard 
                active={settings.theme === "light"} 
                onClick={() => updateSetting("theme", "light")} 
                icon={<Sun size={24} />} 
                label="Light Mode" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Customization</h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary rounded-xl text-primary">
                    <Palette size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Accent Color</p>
                  </div>
                </div>
                <input 
                  type="color" 
                  value={settings.accentColor} 
                  onChange={(e) => updateSetting("accentColor", e.target.value)}
                  className="w-10 h-10 rounded-full border-none bg-transparent cursor-pointer"
                />
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary rounded-xl text-primary">
                    <Type size={20} />
                  </div>
                  <p className="font-bold text-white">Font Size</p>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs text-muted-foreground">A</span>
                  <input 
                    type="range" 
                    min="1" max="3" step="1" 
                    value={settings.fontSize === "small" ? 1 : settings.fontSize === "medium" ? 2 : 3}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      updateSetting("fontSize", v === 1 ? "small" : v === 2 ? "medium" : "large");
                    }}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                  />
                  <span className="text-xl text-white">A</span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-secondary rounded-xl text-primary">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Chat Wallpaper</p>
                      <p className="text-xs text-muted-foreground">Custom background for chats</p>
                    </div>
                  </div>
                  <label className="px-4 py-2 bg-primary/20 text-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/30 transition-all">
                    Upload
                    <input type="file" className="hidden" onChange={handleWallpaperUpload} accept="image/*" />
                  </label>
                </div>
                {settings.chatWallpaper && (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-white/10 group">
                    <img src={settings.chatWallpaper} className="w-full h-full object-cover" alt="Wallpaper" />
                    <button 
                      onClick={() => updateSetting("chatWallpaper", "")}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Preview Box */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20"></div>
          <div className="relative bg-card rounded-2xl p-4 border border-white/5 space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Preview</p>
            <div className="flex gap-2">
              <div className="bg-primary/20 text-primary px-3 py-1.5 rounded-2xl rounded-bl-none text-xs font-medium">Hello! This is a preview.</div>
            </div>
            <div className="flex flex-row-reverse gap-2">
              <div className="bg-primary text-white px-3 py-1.5 rounded-2xl rounded-br-none text-xs font-medium">Looks amazing! 💜</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ThemeCard({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${active ? "border-primary bg-primary/10 text-primary shadow-xl shadow-primary/10" : "border-white/5 bg-card/50 text-muted-foreground hover:border-white/10"}`}
    >
      {icon}
      <p className="font-bold text-sm">{label}</p>
    </button>
  );
}
