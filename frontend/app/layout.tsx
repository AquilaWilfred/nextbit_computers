import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartSyncProvider } from "@/components/CartSyncContext";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import CompareWidget from "@/components/CompareWidget";
import AIChatBox from "@/components/ai/AIChatBox";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextBit",
  description: "NextBit - Your Tech Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider switchable={true}>
          <CartSyncProvider>
            <AuthProvider>
            {children}
            <AIChatBox />
            </AuthProvider>
            <Toaster />
            <CompareWidget />
          </CartSyncProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
