import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MowaChat — Real-Time Social Messaging",
  description: "A modern social platform combining stories, direct messaging, and real-time chat. Share moments, connect instantly, and stay in touch with voice messages, reactions, and live notifications.",
  keywords: ["chat", "stories", "social media", "real-time messaging", "voice messages"],
  openGraph: {
    title: "MowaChat",
    description: "Stories. Messages. Real-time connections.",
    type: "website",
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
 