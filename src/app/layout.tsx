import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Suspense } from "react";
import { ClickEffects } from "@/components/click-effects";
import { ProgressBar } from "@/components/progress-bar";
import { PwaRegister } from "@/components/pwa-register";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0e1c15",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "Quotely",
  appleWebApp: { capable: true, title: "Quotely", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  title: "Smart Quotation & Proposal Generator",
  description: "Professional quotations, approvals and invoices for service businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ToastProvider>
          <Suspense fallback={null}><ProgressBar /></Suspense>
          <ClickEffects />
          <PwaRegister />
          {children}
        </ToastProvider></body>
    </html>
  );
}
