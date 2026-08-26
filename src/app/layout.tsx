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
  title: "IP Helper - AI IP 创作与小红书全链路工坊",
  description: "对话式孵化专属 IP，自动生成爆款分镜故事与小红书图文",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased bg-zinc-950 text-zinc-100`}
    >
      <body className="h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
