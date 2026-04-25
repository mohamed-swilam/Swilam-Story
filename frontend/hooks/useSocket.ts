"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.io connection authenticated with the stored JWT.
 * Uses useState so consumers re-render when the socket connects.
 * Sends a heartbeat every 20s to keep Redis online status alive.
 */
export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(
    socketInstance?.connected ? socketInstance : null
  );
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Reuse existing singleton (connected or still connecting)
    if (socketInstance) {
      if (socketInstance.connected) {
        setSocket(socketInstance);
      } else {
        // Already connecting — just wait for it to connect
        const onConnect = () => setSocket(socketInstance);
        socketInstance.once("connect", onConnect);
        return () => socketInstance?.off("connect", onConnect);
      }
      return;
    }

    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    );

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      socketInstance = newSocket;
      setSocket(newSocket); // trigger re-render so consumers get the live socket
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setSocket(null);
    });

    // Heartbeat — keeps user:id:online alive in Redis (TTL = 30s)
    heartbeatRef.current = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("heartbeat");
      }
    }, 20_000);

    socketInstance = newSocket;

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      // Don't disconnect on unmount — keep the singleton alive
    };
  }, []);

  return socket;
}
