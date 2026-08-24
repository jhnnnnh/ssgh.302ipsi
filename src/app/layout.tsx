import type { Metadata, Viewport } from "next";
import { Hahmlet, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { ImageViewerProvider } from "@/components/providers/ImageViewerProvider";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const hahmlet = Hahmlet({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-hahmlet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "삼성여고 2026 입시",
  description: "실시간 수시 상담 및 입시 관리",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${notoSansKR.variable} ${hahmlet.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ImageViewerProvider>{children}</ImageViewerProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
