import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowthOS - פיתוח אישי חכם",
  description: "אפליקציה לניהול הרגלים, מטרות, והתפתחות אישית",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-950 text-white flex">
        <Sidebar />
        <main className="flex-1 md:mr-64 min-h-screen overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
