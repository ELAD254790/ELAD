import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
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
      className={`${heebo.variable} h-full antialiased`}
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
