"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, MessageSquare, Users, Eye, UserPlus, Loader2, Heart } from "lucide-react";
import { API } from "@/lib/api";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface NotifSettings {
  messages: boolean;
  follows: boolean;
  storyViews: boolean;
  storyReplies: boolean;
  storyReactions: boolean;
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permission, requestPermission, isSupported, sendNotification, isEnabled, toggleEnabled } = useBrowserNotifications();
  const [settings, setSettings] = useState<NotifSettings>({
    messages: true,
    follows: true,
    storyViews: true,
    storyReplies: true,
    storyReactions: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleTestNotification = () => {
    sendNotification("Test Notification", {
      body: "If you hear the sound and see this, notifications are working! 🚀",
      force: true
    });
  };

  // Load current values from User model
  useEffect(() => {
    API.authTest()
      .then((data) => {
        const ns = data.user?.notificationSettings;
        if (ns) {
          setSettings({
            messages:       ns.messages       ?? true,
            follows:        ns.follows        ?? true,
            storyViews:     ns.storyViews     ?? true,
            storyReplies:   ns.storyReplies   ?? true,
            storyReactions: ns.storyReactions ?? true,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof NotifSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    try {
      await API.updateSettings({ notificationSettings: updated });
      // Invalidate user query to trigger SocketListeners real-time
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    } catch (err) {
      console.error(err);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {saving && <Loader2 size={16} className="text-primary animate-spin ml-auto" />}
        </div>

        {/* Browser Notifications Section */}
        {isSupported && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">
              Browser Push
            </h3>
            <div className="bg-primary/5 rounded-3xl border border-primary/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="font-bold text-white">System Notifications</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get real-time alerts on your computer even when Swichat is in the background.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {permission === "granted" ? (
                  <>
                    {isEnabled ? (
                      <>
                        <button
                          onClick={handleTestNotification}
                          className="text-xs font-bold text-primary hover:text-white px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary transition-all border border-primary/20"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => toggleEnabled(false)}
                          className="text-xs font-bold text-destructive hover:bg-destructive hover:text-white px-4 py-2 rounded-xl bg-destructive/10 transition-all border border-destructive/20"
                        >
                          Disable
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleEnabled(true)}
                        className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                      >
                        Enable
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={requestPermission}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Categories Section */}
        <section className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">
              Alert Categories
            </h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <ToggleRow
                icon={<MessageSquare size={20} />}
                title="Messages"
                desc="Chat messages and direct replies"
                enabled={settings.messages}
                onToggle={() => toggle("messages")}
              />
              <ToggleRow
                icon={<UserPlus size={20} />}
                title="New Followers"
                desc="Alert when someone follows your account"
                enabled={settings.follows}
                onToggle={() => toggle("follows")}
              />
              <ToggleRow
                icon={<Eye size={20} />}
                title="Story Views"
                desc="Notifications when your stories are viewed"
                enabled={settings.storyViews}
                onToggle={() => toggle("storyViews")}
              />
              <ToggleRow
                icon={<MessageSquare size={20} className="text-sky-400" />}
                title="Story Replies"
                desc="Comments and text replies to your stories"
                enabled={settings.storyReplies}
                onToggle={() => toggle("storyReplies")}
              />
              <ToggleRow
                icon={<Heart size={20} className="text-pink-400" />}
                title="Story Reactions"
                desc="Emoji reactions left on your stories"
                enabled={settings.storyReactions}
                onToggle={() => toggle("storyReactions")}
              />
            </div>
          </div>
        </section>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-muted-foreground leading-relaxed">
          Notifications are processed on our servers based on these settings. Disabling a category stops the system from creating those alerts entirely.
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  desc,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-5 group">
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-bold text-white">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-primary focus:ring-2 ${
          enabled ? "bg-primary" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
