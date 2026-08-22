import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { ImageViewerProvider } from "@/components/providers/ImageViewerProvider";

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
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 기본 폰트: Pretendard */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* 학생이 고를 수 있는 나머지 웹폰트(구글 폰트 제공분). App Router 루트 레이아웃은
            _document.js와 동등한 위치라 no-page-custom-font 경고는 실제로는 해당되지 않는다. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Gowun+Batang&family=Gowun+Dodum&family=Nanum+Pen+Script&family=Gaegu&family=Do+Hyeon&family=Jua&display=swap"
        />
      </head>
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
