import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { CHAIN_ID, CHAIN_NAME, EXPLORER_NAME, EXPLORER_URL, SYMBOL, TARGET_BLOCK_MS } from "@/lib/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(EXPLORER_URL),
  title: { default: EXPLORER_NAME, template: `%s · ${EXPLORER_NAME}` },
  description: `Block explorer for ${CHAIN_NAME} (chain ID ${CHAIN_ID}, ${SYMBOL}). ${TARGET_BLOCK_MS} ms blocks. Intelligence is gas.`,
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <TopBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
