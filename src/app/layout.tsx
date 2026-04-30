import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AIFallbackBanner } from "@/components/AIFallbackBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CourseForge - AI Course Production",
  description:
    "Production OS for course creation teams. PM↔SME 9-phase pipeline for Coursera, Udemy, university, and corporate L&D.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AIFallbackBanner />
        {children}
      </body>
    </html>
  );
}
