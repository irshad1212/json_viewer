import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSON Viewer",
  description: "Paste, import, inspect and table-view JSON/CSV/Excel instantly."
};

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const stored = localStorage.getItem('theme') || 'dark';
                  const mql = window.matchMedia('(prefers-color-scheme: dark)');
                  const systemPrefersDark = mql.matches;
                  const isDark = stored === 'dark' || (stored === 'system' && systemPrefersDark);
                  document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
