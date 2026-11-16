import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Suspense } from "react";
import { ProgressBar } from "@/components/progress-bar";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
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
          {children}
        </ToastProvider></body>
    </html>
  );
}
