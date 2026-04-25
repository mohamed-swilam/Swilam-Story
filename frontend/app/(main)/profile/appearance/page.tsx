"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Moon, Sun, Type, Image as ImageIcon, Palette, Trash2, Loader2, Check } from "lucide-react";
import { API } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export default function AppearancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    theme: "dark",
    accentColor: "#a855f7",
    chatWallpaper: "",
  });

  const COLORS = ["#a855f7", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#ffffff"];

  useEffect(() => {
    API.authTest().then(data => {
      if (data.user.settings) {
        setSettings(data.user.settings);
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Optimistic Update for global settings
    queryClient.setQueryData(queryKeys.user, (old: any) => {
      if (!old) return old;
      return { ...old, settings: newSettings };
    });

    try {
      await API.updateSettings({ settings: newSettings });
    } catch (err) {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
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
            className="p-2 hover:bg-foreground/5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Appearance</h1>
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
            <div className="bg-card rounded-3xl border border-border divide-y divide-border overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <Palette size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Accent Color</p>
                    <p className="text-xs text-muted-foreground">App-wide primary color</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 px-2">
                  {COLORS.map(color => {
                    const isActive = settings.accentColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => updateSetting("accentColor", color)}
                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${isActive ? 'border-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      >
                        {isActive && <Check size={18} className={color === "#ffffff" ? "text-black" : "text-white"} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Chat Wallpaper</p>
                      <p className="text-xs text-muted-foreground">Custom background for chats</p>
                    </div>
                  </div>
                  <label className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/80 transition-all">
                    Upload
                    <input type="file" className="hidden" onChange={handleWallpaperUpload} accept="image/*" />
                  </label>
                </div>
                {settings.chatWallpaper && (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-border group">
                    <img src={settings.chatWallpaper} className="w-full h-full object-cover" alt="Wallpaper" />
                    <button 
                      onClick={() => updateSetting("chatWallpaper", "")}
                      className="absolute top-2 right-2 p-1.5 bg-background/60 text-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div 
            className="absolute -inset-0.5 rounded-2xl blur opacity-20 transition-all duration-500"
            style={{ backgroundColor: settings.accentColor }}
          ></div>
          <div 
            className="relative bg-card rounded-2xl p-6 border border-border space-y-4 overflow-hidden"
            style={{ 
              backgroundImage: settings.chatWallpaper ? `url(${settings.chatWallpaper})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {settings.chatWallpaper && <div className="absolute inset-0 bg-background/40 pointer-events-none" />}
            
            <p className="relative z-10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Preview</p>
            
            <div className="relative z-10 flex gap-2 animate-fadeIn">
              <div 
                className="px-4 py-2.5 rounded-2xl rounded-bl-none text-sm font-medium leading-relaxed transition-all duration-300 bg-muted/50 text-foreground"
              >
                Hello! This is a preview.
              </div>
            </div>
            
            <div className="relative z-10 flex flex-row-reverse gap-2 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              <div 
                className="rounded-2xl rounded-br-none overflow-hidden text-sm font-medium leading-relaxed transition-all duration-300 w-fit max-w-[85%]"
                style={{ 
                  backgroundColor: settings.accentColor,
                  color: settings.accentColor === "#ffffff" ? "#000000" : "#ffffff",
                }}
              >
                {/* Reply Mockup */}
                <div 
                  className="px-3 pt-2.5 pb-1.5 border-b border-black/10 flex flex-col gap-0.5 bg-black/10"
                >
                  <div 
                    className="pr-2.5 border-r-2 text-right rounded-sm" 
                    style={{ borderColor: settings.accentColor === "#ffffff" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)" }}
                  >
                    <span 
                      className="text-[10px] font-bold block mb-0.5"
                      style={{ color: settings.accentColor === "#ffffff" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)" }}
                    >
                      Other User
                    </span>
                    <p 
                      className="text-[11px] leading-snug line-clamp-1 break-all"
                      style={{ color: settings.accentColor === "#ffffff" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}
                    >
                      Hello! This is a preview.
                    </p>
                  </div>
                </div>
                {/* Message Content */}
                <div className="px-4 py-2.5">
                  Looks amazing! 💜
                </div>
              </div>
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
      className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${active ? "border-primary bg-primary/10 text-primary shadow-xl shadow-primary/10" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
    >
      {icon}
      <p className="font-bold text-sm">{label}</p>
    </button>
  );
}
