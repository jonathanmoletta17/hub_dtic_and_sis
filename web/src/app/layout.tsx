import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { CanonicalHubGuard } from "@/components/auth/CanonicalHubGuard";
import { ThemeProvider } from "@/components/ThemeProvider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem("theme") || localStorage.getItem("hub_theme");
      var theme = stored === "light" || stored === "dark" ? stored : "dark";
      var root = document.documentElement;
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    } catch (error) {
      var fallbackRoot = document.documentElement;
      fallbackRoot.dataset.theme = "dark";
      fallbackRoot.style.colorScheme = "dark";
      fallbackRoot.classList.add("dark");
    }
  })();
`;

export const metadata: Metadata = {
  title: "Hub Operacional - Casa Civil RS",
  description: "Nucleo operacional de chamados da Casa Civil do Estado do RS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased selection:bg-accent-blue/30`}
      >
        <ThemeProvider>
          <CanonicalHubGuard />
          <main className="relative z-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
