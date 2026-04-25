import { useCallback, useEffect, useState } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      const saved = localStorage.getItem("browser_notifications_enabled");
      setIsEnabled(saved !== "false");

      // Sync across instances/tabs
      const handleSync = () => {
        const freshSaved = localStorage.getItem("browser_notifications_enabled");
        setIsEnabled(freshSaved !== "false");
      };
      window.addEventListener("notifications_settings_changed", handleSync);
      window.addEventListener("storage", handleSync); // For other tabs
      return () => {
        window.removeEventListener("notifications_settings_changed", handleSync);
        window.removeEventListener("storage", handleSync);
      };
    }
  }, []);

  const toggleEnabled = useCallback((value: boolean) => {
    setIsEnabled(value);
    localStorage.setItem("browser_notifications_enabled", value.toString());
    // Trigger sync for other instances in the same tab
    window.dispatchEvent(new Event("notifications_settings_changed"));
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      toggleEnabled(true);
    }
    return result;
  }, [toggleEnabled]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions & { force?: boolean }) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !isEnabled) return;
    
    // Only show/play if page is not focused (unless forced)
    if (document.hasFocus() && !options?.force) return;

    // Play notification sound
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
    audio.play().catch(e => console.log("Audio play failed:", e));

    return new Notification(title, {
      icon: "/logo.png",
      badge: "/logo.png",
      silent: false,
      ...options,
    });
  }, [isEnabled]);

  return {
    permission,
    isEnabled,
    toggleEnabled,
    requestPermission,
    sendNotification,
    isSupported: typeof window !== "undefined" && "Notification" in window,
  };
}
