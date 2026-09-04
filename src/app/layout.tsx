import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AppWrapper from "@/components/AppWrapper";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MSR Insight",
  description: "Advanced Academic Reporting System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-icon.svg" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#080C14" />
      </head>
      <body suppressHydrationWarning>
        <AppWrapper>
          {children}
        </AppWrapper>
        <Analytics />
      </body>
    </html>
  );
}
