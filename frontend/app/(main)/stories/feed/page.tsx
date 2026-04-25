"use client";

import { LayoutDashboard } from "lucide-react";

export default function StoriesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background/50 relative z-10 w-full h-full">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
        <div className="w-24 h-24 rounded-full bg-card border border-border flex items-center justify-center shadow-[0_0_30px_var(--color-primary)] shadow-primary/20">
          <LayoutDashboard className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Stories</h2>
        <p className="text-muted-foreground text-sm">
          Select a story from the sidebar to start watching, or discover new people on the Explore page.
        </p>
      </div>
    </div>
  );
}
