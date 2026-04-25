"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.io connection authenticated with the stored JWT.
 * Sends a heartbeat every 20s to keep Redis online status alive.
 */
export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Reuse existing connection if already established
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    );

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Heartbeat — keeps user:id:online alive in Redis (TTL = 30s)
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("heartbeat");
      }
    }, 20_000);

    socketInstance = socket;
    socketRef.current = socket;

    return () => {
      clearInterval(heartbeatInterval);
      // Don't disconnect on unmount — keep the singleton alive
    };
  }, []);

  return socketRef.current;
}
