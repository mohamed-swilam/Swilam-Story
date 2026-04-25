"use client";

import { useEffect, useState, useRef } from "react";
import { API } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, Save, Loader2, User, FileText } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState({
    username: "",
    bio: "",
    user_pic: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    API.authTest()
      .then((data) => {
        setUser({
          username: data.user.username,
          bio: data.user.bio || "",
          user_pic: data.user.user_pic,
        });
        setPreviewUrl(data.user.user_pic);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        router.push("/login");
      });
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("username", user.username);
      formData.append("bio", user.bio);
      if (selectedFile) {
        formData.append("user_pic", selectedFile);
      }

      const res = await API.updateProfile(formData);
      if (res.success) {
        localStorage.setItem("token", res.token);
        router.push("/profile");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
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
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Edit Profile</h1>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/80 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>

        {/* Photo Section */}
        <section className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-2xl overflow-hidden">
              <img 
                src={previewUrl || "/user_profile.jpg"} 
                alt="Preview" 
                className="w-full h-full rounded-full object-cover border-4 border-card"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
              >
                <Camera size={32} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Click to change profile photo</p>
        </section>

        {/* Form Section */}
        <section className="space-y-6 bg-card/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
              <User size={14} /> Username
            </label>
            <input 
              type="text" 
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              className="w-full bg-background/50 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary transition-all font-medium"
              placeholder="Your username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
              <FileText size={14} /> Bio
            </label>
            <textarea 
              value={user.bio}
              onChange={(e) => setUser({ ...user, bio: e.target.value })}
              rows={4}
              className="w-full bg-background/50 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary transition-all font-medium resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-[10px] text-muted-foreground text-right font-medium">
              {user.bio.length} / 160 characters
            </p>
          </div>
        </section>

        {/* Info Box */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-primary/80 leading-relaxed font-medium">
          Note: Your username is public and helps people find you. Make sure it's catchy! Your bio supports emojis and links.
        </div>
      </main>
    </div>
  );
}
