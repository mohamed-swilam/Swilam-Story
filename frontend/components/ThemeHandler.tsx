"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ThemeHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.settings) return;

    const theme = user.settings.theme || "dark";
    const accentColor = user.settings.accentColor || "#a855f7";

    // Update Theme Class
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }

    // Update Accent Color Variable
    document.documentElement.style.setProperty("--primary", accentColor);
    
    // Calculate contrast text color for primary
    // Very basic check: if color is white, use black text
    const contrastColor = accentColor.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff";
    document.documentElement.style.setProperty("--primary-foreground", contrastColor);

  }, [user?.settings?.theme, user?.settings?.accentColor]);

  return null;
}
