"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, MessageSquare, Users, Eye, UserPlus, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

interface NotifSettings {
  messages: boolean;
  follows: boolean;
  storyViews: boolean;
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotifSettings>({
    messages: true,
    follows: true,
    storyViews: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current values from User model
  useEffect(() => {
    API.authTest()
      .then((data) => {
        const ns = data.user?.notificationSettings;
        if (ns) {
          setSettings({
            messages:   ns.messages  ?? true,
            follows:    ns.follows   ?? true,
            storyViews: ns.storyViews ?? true,
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

        <section className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">
              Alert Types
            </h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <ToggleRow
                icon={<MessageSquare size={20} />}
                title="Messages"
                desc="When someone sends you a message"
                enabled={settings.messages}
                onToggle={() => toggle("messages")}
              />
              <ToggleRow
                icon={<UserPlus size={20} />}
                title="New Followers"
                desc="When someone starts following you"
                enabled={settings.follows}
                onToggle={() => toggle("follows")}
              />
              <ToggleRow
                icon={<Eye size={20} />}
                title="Story Views"
                desc="When someone views your story"
                enabled={settings.storyViews}
                onToggle={() => toggle("storyViews")}
              />
            </div>
          </div>
        </section>

        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-primary/80 leading-relaxed font-medium">
          Changes are saved automatically. Disabling a type prevents notifications from being created
          on the server — not just hidden locally.
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
