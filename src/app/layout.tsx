import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CourseForge - AI Course Production",
  description: "AI-Powered End-to-End Course Production Platform by Board Infinity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
