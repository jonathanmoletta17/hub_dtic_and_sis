import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuroraMesh } from "@/components/ui/aurora-mesh";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ecossistema Casa Civil RS — Global Gateway",
  description: "Portal Unificado de Serviços da Casa Civil do Estado do RS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased selection:bg-accent-blue/30`}
      >
        <AuroraMesh />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

