import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { ImageViewerProvider } from "@/components/providers/ImageViewerProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "3학년 2반 입시",
  description: "실시간 수시 상담 및 입시 관리",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <ToastProvider>
          <ConfirmProvider>
            <ImageViewerProvider>
              <AuthProvider>{children}</AuthProvider>
            </ImageViewerProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
