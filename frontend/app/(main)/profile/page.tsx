"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, Shield, Bell } from "lucide-react";

interface UserData {
  username: string;
  user_pic: string;
  bio: string;
  id: string;
}

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  const counts = {
    followers: user.followers?.length || 0,
    following: user.following?.length || 0
  };

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8 pb-32">
        {/* Header Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <section className="relative bg-card rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 border border-border shadow-2xl overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-2xl">
                <img 
                  src={user.user_pic || "/user_profile.jpg"} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover border-4 border-card shadow-inner"
                />
              </div>
              <button className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2.5 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all ring-4 ring-card">
                <Settings size={18} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{user.username || "Loading..."}</h2>
                <p className="text-primary font-medium mt-1">@{user.username.toLowerCase()}</p>
              </div>

              {user.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  {user.bio}
                </p>
              )}
              
              <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
                <button 
                  onClick={() => router.push(`/profile/${user.id}/followers`)}
                  className="text-center md:text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-xl font-bold text-foreground">{counts.followers}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Followers</p>
                </button>
                <div className="w-px h-8 bg-border"></div>
                <button 
                  onClick={() => router.push(`/profile/${user.id}/following`)}
                  className="text-center md:text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-xl font-bold text-foreground">{counts.following}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Following</p>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Account</h3>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">
              <MenuButton href="/profile/edit" icon={<User size={20} />} title="Edit Profile" desc="Change name, bio, and photo" />
              <MenuButton href="/profile/notifications" icon={<Bell size={20} />} title="Notifications" desc="Push, email and system alerts" />
              <MenuButton href="/profile/privacy" icon={<Shield size={20} />} title="Privacy" desc="Visibility and blocked users" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">App Settings</h3>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">
              <MenuButton href="/profile/appearance" icon={<Settings size={20} />} title="Appearance" desc="Theme, font size and colors" />
              <MenuButton href="/profile/data" icon={<Settings size={20} />} title="Data Usage" desc="Media quality and storage" />
            </div>
            
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-300 font-bold group mt-4"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Log Out
            </button>
          </div>
        </section>

        <footer className="text-center pt-8">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">MowaChat v2.0.4 • Made with Love</p>
        </footer>
      </main>
    </div>
  );
}

function MenuButton({ icon, title, desc, href }: { icon: React.ReactNode, title: string, desc: string, href: string }) {
  return (
    <Link href={href} className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-all text-left group">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          {icon}
        </div>
        <div>
          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{desc}</p>
        </div>
      </div>
      <div className="text-muted-foreground/30 group-hover:text-primary transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </div>
    </Link>
  );
}
